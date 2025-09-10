import { Database } from 'bun:sqlite';
import { v4 as uuidv4 } from 'uuid';
import {
  Workflow,
  CodeTemplate,
  QualityRule,
  ProjectConfig,
  GuidanceContext,
  Memory,
  MemoryType,
  MemoryCategory,
  MemorySearchResult,
} from './types.js';

export interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
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
  private db: Database.Database;
  private embeddingModel: any;

  constructor(dbPath: string = '.guidance/guidance.db') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
    this.initializeEmbeddingModel();
  }

  private async initializeEmbeddingModel(): Promise<void> {
    try {
      // Use a lightweight embedding model for local use
      const { pipeline } = await import('@xenova/transformers');
      this.embeddingModel = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
    } catch (error) {
      console.warn('Failed to load embedding model, using fallback:', error);
      this.embeddingModel = null;
    }
  }

  private initializeDatabase(): void {
    // Enable vector extensions
    this.db.exec('PRAGMA journal_mode=WAL;');

    // Create vector-specific tables that work alongside Drizzle tables
    this.db.exec(`
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
      const result = await this.embeddingModel(text, {
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
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

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

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO workflows_vector (id, name, description, content, embedding, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      workflow.id,
      workflow.name,
      workflow.description,
      content,
      JSON.stringify(embedding),
      JSON.stringify(metadata)
    );
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    const stmt = this.db.prepare('SELECT * FROM workflows_vector WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      steps: JSON.parse(row.metadata).steps || [],
      qualityChecks: JSON.parse(row.metadata).qualityChecks || [],
      tags: JSON.parse(row.metadata).tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async searchWorkflows(
    query: string,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const stmt = this.db.prepare('SELECT * FROM workflows_vector');
    const rows = stmt.all() as any[];

    const results = rows.map((row) => {
      const embedding = JSON.parse(row.embedding);
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      return {
        id: row.id,
        content: row.content,
        similarity,
        metadata: JSON.parse(row.metadata),
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

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO templates_vector (id, name, type, content, embedding, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      template.id,
      template.name,
      template.type,
      template.content,
      JSON.stringify(embedding),
      JSON.stringify(metadata)
    );
  }

  async searchTemplates(
    query: string,
    type?: string,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const whereClause = type ? 'WHERE type = ?' : '';
    const stmt = this.db.prepare(
      `SELECT * FROM templates_vector ${whereClause}`
    );
    const rows = type ? stmt.all(type) : (stmt.all() as any[]);

    const results = rows.map((row: any) => {
      const embedding = JSON.parse(row.embedding);
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      return {
        id: row.id,
        content: row.content,
        similarity,
        metadata: JSON.parse(row.metadata),
      };
    });

    return results
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Code analysis operations
  async saveCodeAnalysis(analysis: CodeAnalysis): Promise<void> {
    const embedding = await this.generateEmbedding(analysis.content);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO code_analysis (id, file_path, content, embedding, analysis)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      analysis.id,
      analysis.filePath,
      analysis.content,
      JSON.stringify(embedding),
      JSON.stringify(analysis.analysis)
    );
  }

  async findSimilarCode(
    filePath: string,
    content: string,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(content);
    const stmt = this.db.prepare(
      'SELECT * FROM code_analysis WHERE file_path != ?'
    );
    const rows = stmt.all(filePath) as any[];

    const results = rows.map((row) => {
      const embedding = JSON.parse(row.embedding);
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      return {
        id: row.id,
        content: row.content,
        similarity,
        metadata: {
          filePath: row.file_path,
          analysis: JSON.parse(row.analysis),
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
    const [similarCode, suggestedWorkflows, suggestedTemplates] =
      await Promise.all([
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

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO quality_rules_vector (id, name, description, content, embedding, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      rule.id,
      rule.name,
      rule.description,
      content,
      JSON.stringify(embedding),
      JSON.stringify(metadata)
    );
  }

  async searchQualityRules(
    query: string,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const stmt = this.db.prepare('SELECT * FROM quality_rules_vector');
    const rows = stmt.all() as any[];

    const results = rows.map((row) => {
      const embedding = JSON.parse(row.embedding);
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      return {
        id: row.id,
        content: row.content,
        similarity,
        metadata: JSON.parse(row.metadata),
      };
    });

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  // Project configuration
  async saveProjectConfig(config: ProjectConfig): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO project_config (id, config)
      VALUES (?, ?)
    `);

    stmt.run('default', JSON.stringify(config));
  }

  async getProjectConfig(): Promise<ProjectConfig | null> {
    const stmt = this.db.prepare(
      'SELECT config FROM project_config WHERE id = ?'
    );
    const row = stmt.get('default') as any;

    return row ? JSON.parse(row.config) : null;
  }

  // Utility methods
  async listWorkflows(): Promise<Workflow[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM workflows_vector ORDER BY created_at DESC'
    );
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      steps: JSON.parse(row.metadata).steps || [],
      qualityChecks: JSON.parse(row.metadata).qualityChecks || [],
      tags: JSON.parse(row.metadata).tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listTemplates(): Promise<CodeTemplate[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM templates_vector ORDER BY created_at DESC'
    );
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      content: row.content,
      variables: JSON.parse(row.metadata).variables || [],
      description: row.description,
      tags: JSON.parse(row.metadata).tags || [],
    }));
  }

  async listQualityRules(): Promise<QualityRule[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM quality_rules_vector ORDER BY created_at DESC'
    );
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      severity: row.severity,
      pattern: JSON.parse(row.metadata).pattern,
      check: row.description,
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

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories_vector (
        id, content, type, scope, category, tags, project_id, 
        context, importance, embedding, metadata, 
        created_at, updated_at, last_accessed, access_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
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

    const params: any[] = [queryVector];

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

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      memory: {
        id: row.id,
        content: row.content,
        type: row.type as MemoryType,
        scope: row.scope as 'global' | 'project',
        category: row.category as MemoryCategory,
        tags: JSON.parse(row.tags),
        projectId: row.project_id || undefined,
        context: JSON.parse(row.context),
        importance: row.importance,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastAccessed: row.last_accessed,
        accessCount: row.access_count,
      },
      relevance: row.similarity,
      context: `Memory about ${row.type} in ${row.category} category`,
    }));
  }

  async updateMemory(memory: Memory): Promise<void> {
    await this.saveMemory(memory);
  }

  async deleteMemory(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM memories_vector WHERE id = ?');
    stmt.run(id);
  }

  close(): void {
    this.db.close();
  }
}
