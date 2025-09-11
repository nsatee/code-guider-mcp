// Database will be imported dynamically based on runtime
import type {
  CodeTemplate,
  Memory,
  MemoryCategory,
  MemorySearchResult,
  MemoryType,
  ProjectConfig,
  QualityRule,
  Workflow,
} from './types';

export interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface CodeAnalysis {
  id: string;
  filePath: string;
  content: string;
  embedding: number[];
  analysis: {
    complexity: number;
    patterns: string[];
    suggestions: string[];
    qualityScore: number;
  };
  createdAt: string;
}

export class VectorStorage {
  private db: any;
  private embeddingModel: unknown = null;

  constructor(db: any) {
    this.db = db;
    this.initializeEmbeddingModel();
  }

  static async create(dbPath: string = '.guidance/guidance.db'): Promise<VectorStorage> {
    // Use LibSQL for cross-platform compatibility
    try {
      const { createClient } = await import('@libsql/client');
      const db = createClient({
        url: `file:${dbPath}`,
      });
      const storage = new VectorStorage(db);
      await storage.initializeDatabase();
      return storage;
    } catch (error) {
      throw new Error(`Failed to load LibSQL implementation: ${error}`);
    }
  }

  private async initializeEmbeddingModel(): Promise<void> {
    try {
      // Use a lightweight embedding model for local use
      const { pipeline } = await import('@xenova/transformers');
      this.embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    } catch (error) {
      console.warn('Failed to load embedding model, using fallback:', error);
      this.embeddingModel = null;
    }
  }

  private async initializeDatabase(): Promise<void> {
    // Enable vector extensions
    await this.db.execute('PRAGMA journal_mode=WAL;');

    // Create vector-specific tables that work alongside Drizzle tables
    await this.db.execute(`
      -- Create vector storage tables
      CREATE TABLE IF NOT EXISTS workflows_vector (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS templates_vector (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS quality_rules_vector (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS code_analysis (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB,
        analysis TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_workflows_vector_name ON workflows_vector(name);
      CREATE INDEX IF NOT EXISTS idx_templates_vector_type ON templates_vector(type);
      CREATE INDEX IF NOT EXISTS idx_quality_rules_vector_name ON quality_rules_vector(name);
      CREATE INDEX IF NOT EXISTS idx_code_analysis_path ON code_analysis(file_path);
    `);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingModel) {
      // Fallback: simple hash-based embedding
      return this.generateHashEmbedding(text);
    }

    try {
      const result = await (this.embeddingModel as any)(text, {
        pooling: 'mean',
        normalize: true,
      });
      return Array.from(result.data);
    } catch (error) {
      console.warn('Failed to generate embedding, using fallback:', error);
      return this.generateHashEmbedding(text);
    }
  }

  private generateHashEmbedding(text: string): number[] {
    // Simple hash-based embedding as fallback
    const hash = this.simpleHash(text);
    const embedding = new Array(384).fill(0);

    for (let i = 0; i < Math.min(hash.length, 384); i++) {
      embedding[i] = (hash.charCodeAt(i) % 256) / 256;
    }

    return embedding;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Workflow operations with vector search
  async saveWorkflow(workflow: Workflow): Promise<void> {
    const content = `${workflow.name} ${workflow.description} ${workflow.qualityChecks.join(' ')}`;
    const embedding = await this.generateEmbedding(content);
    const metadata = {
      tags: workflow.tags,
      steps: workflow.steps.length,
      qualityChecks: workflow.qualityChecks.length,
    };

    const now = new Date().toISOString();
    await this.db.execute(
      `
      INSERT OR REPLACE INTO workflows_vector (id, name, description, content, embedding, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        workflow.id,
        workflow.name,
        workflow.description,
        content,
        JSON.stringify(embedding),
        JSON.stringify(metadata),
        workflow.createdAt || now,
        workflow.updatedAt || now,
      ]
    );
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    const result = await this.db.execute('SELECT * FROM workflows_vector WHERE id = ?', [id]);
    const row = result.rows[0] as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row['id'] as string,
      name: row['name'] as string,
      description: row['description'] as string,
      steps: JSON.parse(row['metadata'] as string).steps || [],
      qualityChecks: JSON.parse(row['metadata'] as string).qualityChecks || [],
      tags: JSON.parse(row['metadata'] as string).tags || [],
      createdAt: row['created_at'] as string,
      updatedAt: row['updated_at'] as string,
    };
  }

  async searchWorkflows(query: string, limit: number = 10): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const result = await this.db.execute('SELECT * FROM workflows_vector');
    const rows = result.rows as Record<string, unknown>[];

    const results = rows.map((row) => {
      const embedding = JSON.parse(row['embedding'] as string);
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      return {
        id: row['id'] as string,
        content: row['content'] as string,
        similarity,
        metadata: JSON.parse(row['metadata'] as string),
      };
    });

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  // Template operations with vector search
  async saveTemplate(template: CodeTemplate): Promise<void> {
    const content = `${template.name} ${template.description} ${template.content}`;
    const embedding = await this.generateEmbedding(content);
    const metadata = {
      type: template.type,
      variables: template.variables,
      tags: template.tags,
    };

    const now = new Date().toISOString();
    await this.db.execute(
      `
      INSERT OR REPLACE INTO templates_vector (id, name, type, content, embedding, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        template.id,
        template.name,
        template.type,
        template.content,
        JSON.stringify(embedding),
        JSON.stringify(metadata),
        template.createdAt || now,
        template.updatedAt || now,
      ]
    );
  }

  async searchTemplates(
    query: string,
    type?: string,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const whereClause = type ? 'WHERE type = ?' : '';
    const result = await this.db.execute(
      `SELECT * FROM templates_vector ${whereClause}`,
      type ? [type] : []
    );
    const rows = result.rows as Record<string, unknown>[];

    const results = rows.map((row: Record<string, unknown>) => {
      const embedding = JSON.parse(row['embedding'] as string);
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      return {
        id: row['id'] as string,
        content: row['content'] as string,
        similarity,
        metadata: JSON.parse(row['metadata'] as string),
      };
    });

    return results
      .sort((a: VectorSearchResult, b: VectorSearchResult) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Code analysis operations
  async saveCodeAnalysis(analysis: CodeAnalysis): Promise<void> {
    const embedding = await this.generateEmbedding(analysis.content);
    await this.db.execute(
      `
      INSERT OR REPLACE INTO code_analysis (id, file_path, content, embedding, analysis)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        analysis.id,
        analysis.filePath,
        analysis.content,
        JSON.stringify(embedding),
        JSON.stringify(analysis.analysis),
      ]
    );
  }

  async findSimilarCode(
    filePath: string,
    content: string,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(content);
    const result = await this.db.execute('SELECT * FROM code_analysis WHERE file_path != ?', [
      filePath,
    ]);
    const rows = result.rows as Record<string, unknown>[];

    const results = rows.map((row) => {
      const embedding = JSON.parse(row['embedding'] as string);
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      return {
        id: row['id'] as string,
        content: row['content'] as string,
        similarity,
        metadata: {
          filePath: row['file_path'] as string,
          analysis: JSON.parse(row['analysis'] as string),
        },
      };
    });

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  // AI-powered code suggestions
  async getCodeSuggestions(
    filePath: string,
    content: string
  ): Promise<{
    similarCode: VectorSearchResult[];
    suggestedWorkflows: VectorSearchResult[];
    suggestedTemplates: VectorSearchResult[];
  }> {
    const [similarCode, suggestedWorkflows, suggestedTemplates] = await Promise.all([
      this.findSimilarCode(filePath, content, 3),
      this.searchWorkflows(content, 3),
      this.searchTemplates(content, undefined, 3),
    ]);

    return {
      similarCode,
      suggestedWorkflows,
      suggestedTemplates,
    };
  }

  // Quality rules with vector search
  async saveQualityRule(rule: QualityRule): Promise<void> {
    const content = `${rule.name} ${rule.description} ${rule.check}`;
    const embedding = await this.generateEmbedding(content);
    const metadata = {
      type: rule.type,
      severity: rule.severity,
      pattern: rule.pattern,
    };

    const now = new Date().toISOString();
    await this.db.execute(
      `
      INSERT OR REPLACE INTO quality_rules_vector (id, name, description, content, embedding, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        rule.id,
        rule.name,
        rule.description,
        content,
        JSON.stringify(embedding),
        JSON.stringify(metadata),
        rule.createdAt || now,
        rule.updatedAt || now,
      ]
    );
  }

  async searchQualityRules(query: string, limit: number = 10): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const result = await this.db.execute('SELECT * FROM quality_rules_vector');
    const rows = result.rows as Record<string, unknown>[];

    const results = rows.map((row) => {
      const embedding = JSON.parse(row['embedding'] as string);
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      return {
        id: row['id'] as string,
        content: row['content'] as string,
        similarity,
        metadata: JSON.parse(row['metadata'] as string),
      };
    });

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  // Project configuration
  async saveProjectConfig(config: ProjectConfig): Promise<void> {
    const result = await this.db.execute(`
      INSERT OR REPLACE INTO project_config (id, config)
      VALUES (?, ?)
    `);

    await this.db.execute('default', JSON.stringify(config));
  }

  async getProjectConfig(): Promise<ProjectConfig | null> {
    const result = await this.db.execute('SELECT config FROM project_config WHERE id = ?', [
      'default',
    ]);
    const row = result.rows[0] as Record<string, unknown> | undefined;

    return row ? JSON.parse(row['config'] as string) : null;
  }

  // Utility methods
  async listWorkflows(): Promise<Workflow[]> {
    const result = await this.db.execute('SELECT * FROM workflows_vector ORDER BY created_at DESC');
    const rows = result.rows as Record<string, unknown>[];

    return rows.map((row) => ({
      id: row['id'] as string,
      name: row['name'] as string,
      description: row['description'] as string,
      steps: JSON.parse(row['metadata'] as string).steps || [],
      qualityChecks: JSON.parse(row['metadata'] as string).qualityChecks || [],
      tags: JSON.parse(row['metadata'] as string).tags || [],
      createdAt: row['created_at'] as string,
      updatedAt: row['updated_at'] as string,
    }));
  }

  async listTemplates(): Promise<CodeTemplate[]> {
    const result = await this.db.execute('SELECT * FROM templates_vector ORDER BY created_at DESC');
    const rows = result.rows as Record<string, unknown>[];

    return rows.map((row) => ({
      id: row['id'] as string,
      name: row['name'] as string,
      type: row['type'] as 'component' | 'function' | 'class' | 'interface' | 'test' | 'config',
      content: row['content'] as string,
      variables: JSON.parse(row['metadata'] as string).variables || [],
      description: row['description'] as string,
      tags: JSON.parse(row['metadata'] as string).tags || [],
    }));
  }

  async listQualityRules(): Promise<QualityRule[]> {
    const result = await this.db.execute(
      'SELECT * FROM quality_rules_vector ORDER BY created_at DESC'
    );
    const rows = result.rows as Record<string, unknown>[];

    return rows.map((row) => ({
      id: row['id'] as string,
      name: row['name'] as string,
      description: row['description'] as string,
      type: row['type'] as 'lint' | 'test' | 'security' | 'performance' | 'accessibility',
      severity: row['severity'] as 'error' | 'warning' | 'info',
      pattern: JSON.parse(row['metadata'] as string).pattern,
      check: row['description'] as string,
    }));
  }

  // Memory operations
  async saveMemory(memory: Memory): Promise<void> {
    const embedding = await this.generateEmbedding(memory.content);
    const metadata = {
      type: memory.type,
      scope: memory.scope,
      category: memory.category,
      tags: memory.tags,
      projectId: memory.projectId,
      context: memory.context,
      importance: memory.importance,
    };

    const result = await this.db.execute(`
      INSERT OR REPLACE INTO memories_vector (
        id, content, type, scope, category, tags, project_id, 
        context, importance, embedding, metadata, 
        created_at, updated_at, last_accessed, access_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await this.db.execute(
      memory.id,
      memory.content,
      memory.type,
      memory.scope,
      memory.category,
      JSON.stringify(memory.tags),
      memory.projectId || null,
      JSON.stringify(memory.context),
      memory.importance,
      Buffer.from(new Float32Array(embedding).buffer),
      JSON.stringify(metadata),
      memory.createdAt,
      memory.updatedAt,
      memory.lastAccessed,
      memory.accessCount
    );
  }

  async searchMemories(
    query: string,
    type?: MemoryType,
    category?: MemoryCategory,
    limit: number = 10
  ): Promise<MemorySearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const queryVector = Buffer.from(new Float32Array(queryEmbedding).buffer);

    let sql = `
      SELECT 
        id, content, type, scope, category, tags, project_id, 
        context, importance, metadata, created_at, updated_at, 
        last_accessed, access_count,
        vector_similarity(embedding, ?) as similarity
      FROM memories_vector
      WHERE 1=1
    `;

    const params: unknown[] = [queryVector];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY similarity DESC LIMIT ?';
    params.push(limit);

    const result = await this.db.execute(sql, params);
    const rows = result.rows as Record<string, unknown>[];

    return rows.map((row) => {
      const memory: Memory = {
        id: row['id'] as string,
        content: row['content'] as string,
        type: row['type'] as MemoryType,
        scope: row['scope'] as 'global' | 'project',
        category: row['category'] as MemoryCategory,
        tags: JSON.parse(row['tags'] as string),
        projectId: row['projectId'] as string | undefined,
        context: JSON.parse(row['context'] as string),
        importance: row['importance'] as number,
        createdAt: row['created_at'] as string,
        updatedAt: row['updated_at'] as string,
        lastAccessed: row['last_accessed'] as string,
        accessCount: row['access_count'] as number,
      };

      if (row['project_id']) {
        memory.projectId = row['project_id'] as string;
      }

      return {
        memory,
        relevance: row['similarity'] as number,
        context: `Memory about ${row['type']} in ${row['category']} category`,
      };
    });
  }

  async updateMemory(memory: Memory): Promise<void> {
    await this.saveMemory(memory);
  }

  async deleteMemory(id: string): Promise<void> {
    const result = await this.db.execute('DELETE FROM memories_vector WHERE id = ?');
    await this.db.execute(id);
  }

  close(): void {
    this.db.close();
  }
}
