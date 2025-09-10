export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  qualityChecks: string[];
  templates?: Record<string, string>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  action: 'create' | 'modify' | 'validate' | 'test' | 'document';
  template?: string;
  rules?: string[];
  order: number;
}

export interface CodeTemplate {
  id: string;
  name: string;
  type: 'component' | 'function' | 'class' | 'interface' | 'test' | 'config';
  content: string;
  variables: string[];
  description: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QualityRule {
  id: string;
  name: string;
  description: string;
  type: 'lint' | 'test' | 'security' | 'performance' | 'accessibility';
  severity: 'error' | 'warning' | 'info';
  pattern?: string | undefined;
  check: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectConfig {
  name: string;
  type: 'react' | 'node' | 'fullstack' | 'library' | 'api';
  frameworks: string[];
  languages: string[];
  qualityRules: string[];
  workflows: string[];
  templates: string[];
}

export interface GuidanceContext {
  projectPath: string;
  currentFile?: string;
  projectType: string;
  frameworks: string[];
  qualityLevel: 'strict' | 'moderate' | 'relaxed';
}

// Role-based system inspired by Anubis
export interface WorkflowRole {
  id: string;
  name:
    | 'product-manager'
    | 'architect'
    | 'senior-developer'
    | 'code-review'
    | 'integration-engineer';
  displayName: string;
  description: string;
  capabilities: string[];
  responsibilities: string[];
  context: Record<string, any>;
  qualityGates: string[];
  nextRoles: string[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  currentRole: string;
  completedSteps: string[];
  currentStep: string;
  context: Record<string, any>;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'waiting';
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  metrics: {
    filesCreated: number;
    filesModified: number;
    testsWritten: number;
    coverage: number;
    qualityScore: number;
  };
  roleHistory: RoleTransition[];
}

export interface RoleTransition {
  fromRole: string;
  toRole: string;
  timestamp: string;
  context: Record<string, any>;
  handoffNotes: string;
}

export interface StepExecution {
  id: string;
  executionId: string;
  stepId: string;
  roleId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  result?: string;
  metrics?: Record<string, any>;
  context: Record<string, any>;
  aiSuggestions: string[];
  qualityChecks: QualityCheckResult[];
}

export interface QualityCheckResult {
  ruleId: string;
  ruleName: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  suggestions: string[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  agentType: 'cursor' | 'copilot' | 'roocode' | 'kilocode' | 'general';
  roles: string[];
  steps: WorkflowStep[];
  qualityGates: string[];
  context: Record<string, any>;
  variables: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentCapabilities {
  agentType: string;
  supportedRoles: string[];
  capabilities: string[];
  limitations: string[];
  templates: string[];
}

export interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

// Memory Management Types
export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  scope: MemoryScope;
  category: MemoryCategory;
  tags: string[];
  projectId?: string;
  context: Record<string, any>;
  importance: number; // 1-10 scale
  createdAt: string;
  updatedAt: string;
  lastAccessed: string;
  accessCount: number;
}

export type MemoryType =
  | 'code_pattern'
  | 'best_practice'
  | 'project_requirement'
  | 'user_preference'
  | 'error_solution'
  | 'workflow_insight'
  | 'template_usage'
  | 'quality_rule'
  | 'architecture_decision'
  | 'performance_tip'
  | 'security_note'
  | 'integration_pattern';

export type MemoryScope = 'global' | 'project' | 'user';

export type MemoryCategory =
  | 'technical'
  | 'process'
  | 'preference'
  | 'learning'
  | 'troubleshooting'
  | 'optimization';

export interface MemoryRoutingDecision {
  scope: MemoryScope;
  reasoning: string;
  confidence: number;
  factors: string[];
}

export interface MemorySearchResult {
  memory: Memory;
  relevance: number;
  context: string;
}

// Memory Rules for Agent Requests
export interface MemoryRule {
  id: string;
  name: string;
  description: string;
  trigger: MemoryRuleTrigger;
  scope: MemoryScope;
  memoryTypes: MemoryType[];
  memoryCategories: MemoryCategory[];
  maxMemories: number;
  relevanceThreshold: number;
  context: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryRuleTrigger {
  type:
    | 'file_path'
    | 'project_type'
    | 'workflow_step'
    | 'code_analysis'
    | 'user_query'
    | 'always';
  patterns: string[];
  conditions: Record<string, any>;
}

export interface AgentRequestContext {
  filePath?: string;
  projectPath?: string;
  projectType?: string;
  workflowId?: string;
  workflowStep?: string;
  userQuery?: string;
  codeContent?: string;
  analysisType?: string;
  agentType?: 'cursor' | 'copilot' | 'roocode' | 'kilocode';
}

export interface EnhancedAgentRequest {
  originalRequest: any;
  context: AgentRequestContext;
  relevantMemories: MemorySearchResult[];
  memoryRules: MemoryRule[];
  enhancedPrompt: string;
}

export interface ProjectInfo {
  name: string;
  type: string;
  frameworks: string[];
  languages: string[];
  path: string;
  packageManager?: string;
  dependencies?: string[];
  devDependencies?: string[];
  databases?: string[];
  tools?: string[];
}
