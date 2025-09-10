import { DrizzleStorage } from './db/drizzle-storage';
import type { CodeAnalysis } from './storage-interface';
import type {
  CodeTemplate,
  Memory,
  MemoryCategory,
  MemoryRule,
  MemorySearchResult,
  MemoryType,
  ProjectConfig,
  QualityRule,
  VectorSearchResult,
  Workflow,
} from './types';
import { VectorStorage } from './vector-storage';

/**
 * Hybrid storage implementation that combines:
 * - Drizzle ORM for fast CRUD operations
 * - VectorStorage for semantic search and AI features
 */
export class HybridStorage {
  private drizzleStorage: DrizzleStorage;
  private vectorStorage: VectorStorage;

  constructor(dbPath: string = '.guidance/guidance.db') {
    this.drizzleStorage = new DrizzleStorage();
    this.vectorStorage = new VectorStorage(dbPath);
  }

  // Workflow operations - using Drizzle for CRUD, VectorStorage for search
  async saveWorkflow(workflow: Workflow): Promise<void> {
    // Save to both storages
    await Promise.all([
      this.drizzleStorage.saveWorkflow(workflow),
      this.vectorStorage.saveWorkflow(workflow),
    ]);
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    // Use Drizzle for fast retrieval
    return await this.drizzleStorage.getWorkflow(id);
  }

  async listWorkflows(): Promise<Workflow[]> {
    // Use Drizzle for fast listing
    return await this.drizzleStorage.listWorkflows();
  }

  async deleteWorkflow(id: string): Promise<void> {
    // Delete from both storages
    await Promise.all([
      this.drizzleStorage.deleteWorkflow(id),
      // Note: VectorStorage doesn't have delete method, but we can add it
    ]);
  }

  async searchWorkflows(query: string, limit: number = 10): Promise<VectorSearchResult[]> {
    // Use VectorStorage for semantic search
    return await this.vectorStorage.searchWorkflows(query, limit);
  }

  // Template operations
  async saveTemplate(template: CodeTemplate): Promise<void> {
    await Promise.all([
      this.drizzleStorage.saveTemplate(template),
      this.vectorStorage.saveTemplate(template),
    ]);
  }

  async getTemplate(id: string): Promise<CodeTemplate | null> {
    return await this.drizzleStorage.getTemplate(id);
  }

  async listTemplates(): Promise<CodeTemplate[]> {
    return await this.drizzleStorage.listTemplates();
  }

  async searchTemplates(
    query: string,
    type?: string,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    return await this.vectorStorage.searchTemplates(query, type, limit);
  }

  // Quality rules operations
  async saveQualityRule(rule: QualityRule): Promise<void> {
    await Promise.all([
      this.drizzleStorage.saveQualityRule(rule),
      this.vectorStorage.saveQualityRule(rule),
    ]);
  }

  async getQualityRule(id: string): Promise<QualityRule | null> {
    return await this.drizzleStorage.getQualityRule(id);
  }

  async listQualityRules(): Promise<QualityRule[]> {
    return await this.drizzleStorage.listQualityRules();
  }

  async searchQualityRules(query: string, limit: number = 10): Promise<VectorSearchResult[]> {
    return await this.vectorStorage.searchQualityRules(query, limit);
  }

  // Project configuration
  async saveProjectConfig(config: ProjectConfig): Promise<void> {
    await this.drizzleStorage.saveProjectConfig(config);
  }

  async getProjectConfig(): Promise<ProjectConfig | null> {
    return await this.drizzleStorage.getProjectConfig();
  }

  // Vector-specific operations (delegate to VectorStorage)
  async saveCodeAnalysis(analysis: CodeAnalysis): Promise<void> {
    return await this.vectorStorage.saveCodeAnalysis(analysis);
  }

  // TODO: Implement this in VectorStorage
  async getCodeAnalysis(_id: string): Promise<CodeAnalysis | null> {
    // This method doesn't exist in VectorStorage, so we'll implement a simple version
    // In a real implementation, you'd add this to VectorStorage
    return null;
  }

  async findSimilarCode(
    filePath: string,
    content: string,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    return await this.vectorStorage.findSimilarCode(filePath, content, limit);
  }

  async getCodeSuggestions(
    filePath: string,
    content: string
  ): Promise<{
    similarCode: VectorSearchResult[];
    suggestedWorkflows: VectorSearchResult[];
    suggestedTemplates: VectorSearchResult[];
  }> {
    return await this.vectorStorage.getCodeSuggestions(filePath, content);
  }

  // Memory operations
  async saveMemory(memory: Memory): Promise<void> {
    // Save to both storages
    await this.drizzleStorage.saveMemory(memory);
    await this.vectorStorage.saveMemory(memory);
  }

  async getMemory(id: string): Promise<Memory | null> {
    return await this.drizzleStorage.getMemory(id);
  }

  async listMemories(
    type?: MemoryType,
    category?: MemoryCategory,
    scope?: 'global' | 'project',
    limit: number = 50
  ): Promise<Memory[]> {
    return await this.drizzleStorage.listMemories(type, category, scope, limit);
  }

  async searchMemories(
    query: string,
    type?: MemoryType,
    category?: MemoryCategory,
    limit: number = 10
  ): Promise<MemorySearchResult[]> {
    return await this.vectorStorage.searchMemories(query, type, category, limit);
  }

  async updateMemory(memory: Memory): Promise<void> {
    await this.drizzleStorage.updateMemory(memory);
    await this.vectorStorage.updateMemory(memory);
  }

  async deleteMemory(id: string): Promise<void> {
    await this.drizzleStorage.deleteMemory(id);
    await this.vectorStorage.deleteMemory(id);
  }

  async getMemoryStats(): Promise<{
    total: number;
    byType: Record<MemoryType, number>;
    byCategory: Record<MemoryCategory, number>;
    byScope: Record<'global' | 'project', number>;
  }> {
    return await this.drizzleStorage.getMemoryStats();
  }

  // Memory Rule operations
  async saveMemoryRule(rule: MemoryRule): Promise<void> {
    await this.drizzleStorage.saveMemoryRule(rule);
  }

  async getMemoryRule(id: string): Promise<MemoryRule | null> {
    return await this.drizzleStorage.getMemoryRule(id);
  }

  async listMemoryRules(scope?: 'global' | 'project'): Promise<MemoryRule[]> {
    return await this.drizzleStorage.listMemoryRules(scope);
  }

  async updateMemoryRule(rule: MemoryRule): Promise<void> {
    await this.drizzleStorage.updateMemoryRule(rule);
  }

  async deleteMemoryRule(id: string): Promise<void> {
    await this.drizzleStorage.deleteMemoryRule(id);
  }

  // Utility methods
  async close(): Promise<void> {
    this.vectorStorage.close();
  }
}
