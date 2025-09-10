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

export interface StorageInterface {
  // Basic CRUD operations
  saveWorkflow(workflow: Workflow): Promise<void>;
  getWorkflow(id: string): Promise<Workflow | null>;
  listWorkflows(): Promise<Workflow[]>;
  deleteWorkflow(id: string): Promise<void>;
  searchWorkflows(query: string, limit?: number): Promise<VectorSearchResult[]>;

  saveTemplate(template: CodeTemplate): Promise<void>;
  getTemplate(id: string): Promise<CodeTemplate | null>;
  listTemplates(): Promise<CodeTemplate[]>;
  searchTemplates(query: string, type?: string, limit?: number): Promise<VectorSearchResult[]>;

  saveQualityRule(rule: QualityRule): Promise<void>;
  getQualityRule(id: string): Promise<QualityRule | null>;
  listQualityRules(): Promise<QualityRule[]>;
  searchQualityRules(query: string, limit?: number): Promise<VectorSearchResult[]>;

  saveProjectConfig(config: ProjectConfig): Promise<void>;
  getProjectConfig(): Promise<ProjectConfig | null>;

  // Vector operations
  saveCodeAnalysis(analysis: CodeAnalysis): Promise<void>;
  getCodeAnalysis(id: string): Promise<CodeAnalysis | null>;
  findSimilarCode(filePath: string, content: string, limit?: number): Promise<VectorSearchResult[]>;
  getCodeSuggestions(
    filePath: string,
    content: string
  ): Promise<{
    similarCode: VectorSearchResult[];
    suggestedWorkflows: VectorSearchResult[];
    suggestedTemplates: VectorSearchResult[];
  }>;

  // Memory operations
  saveMemory(memory: Memory): Promise<void>;
  getMemory(id: string): Promise<Memory | null>;
  listMemories(
    type?: MemoryType,
    category?: MemoryCategory,
    scope?: 'global' | 'project',
    limit?: number
  ): Promise<Memory[]>;
  searchMemories(
    query: string,
    type?: MemoryType,
    category?: MemoryCategory,
    limit?: number
  ): Promise<MemorySearchResult[]>;
  updateMemory(memory: Memory): Promise<void>;
  deleteMemory(id: string): Promise<void>;
  getMemoryStats(): Promise<{
    total: number;
    byType: Record<MemoryType, number>;
    byCategory: Record<MemoryCategory, number>;
    byScope: Record<'global' | 'project', number>;
  }>;

  // Memory Rule operations
  saveMemoryRule(rule: MemoryRule): Promise<void>;
  getMemoryRule(id: string): Promise<MemoryRule | null>;
  listMemoryRules(scope?: 'global' | 'project'): Promise<MemoryRule[]>;
  updateMemoryRule(rule: MemoryRule): Promise<void>;
  deleteMemoryRule(id: string): Promise<void>;

  // Utility
  close(): void;
}
