import type { MemoryRouter } from './memory-router.js';
import type { ProjectManager } from './project-manager.js';
import type {
  AgentRequestContext,
  EnhancedAgentRequest,
  MemoryCategory,
  MemoryRule,
  MemorySearchResult,
  MemoryType,
} from './types.js';

/**
 * Memory Rule Manager that automatically attaches relevant memories to agent requests
 */
export class MemoryRuleManager {
  private memoryRouter: MemoryRouter;
  private rules: MemoryRule[] = [];

  constructor(memoryRouter: MemoryRouter, projectManager: ProjectManager) {
    this.memoryRouter = memoryRouter;
    this.projectManager = projectManager;
  }

  /**
   * Initialize default memory rules for a project
   */
  public async initializeProjectRules(
    projectPath: string,
    projectType: string,
  ): Promise<void> {
    const projectId = this.generateProjectId(projectPath);

    // Create default rules based on project type
    const defaultRules = this.createDefaultRules(projectType, projectId);

    for (const rule of defaultRules) {
      await this.saveRule(rule);
    }

    // Load all rules for this project
    await this.loadRules(projectId);
  }

  /**
   * Create default memory rules based on project type
   */
  private createDefaultRules(
    projectType: string,
    projectId: string,
  ): MemoryRule[] {
    const now = new Date().toISOString();
    const rules: MemoryRule[] = [];

    // Rule 1: Always attach best practices and security notes
    rules.push({
      id: `rule_${projectId}_best_practices`,
      name: 'Best Practices & Security',
      description:
        'Always attach best practices and security-related memories to all requests',
      trigger: {
        type: 'always',
        patterns: [],
        conditions: {},
      },
      scope: 'global',
      memoryTypes: ['best_practice', 'security_note', 'performance_tip'],
      memoryCategories: ['technical', 'process'],
      maxMemories: 3,
      relevanceThreshold: 0.7,
      context: { projectType },
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    // Rule 2: Attach project-specific requirements and architecture decisions
    rules.push({
      id: `rule_${projectId}_project_specific`,
      name: 'Project-Specific Knowledge',
      description:
        'Attach project-specific requirements and architecture decisions',
      trigger: {
        type: 'always',
        patterns: [],
        conditions: {},
      },
      scope: 'project',
      memoryTypes: [
        'project_requirement',
        'architecture_decision',
        'workflow_insight',
      ],
      memoryCategories: ['technical', 'process'],
      maxMemories: 2,
      relevanceThreshold: 0.6,
      context: { projectType },
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    // Rule 3: File-specific memories for code analysis
    rules.push({
      id: `rule_${projectId}_file_specific`,
      name: 'File-Specific Patterns',
      description:
        'Attach memories related to specific file types and patterns',
      trigger: {
        type: 'file_path',
        patterns: ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs'],
        conditions: {},
      },
      scope: 'project',
      memoryTypes: ['code_pattern', 'error_solution', 'template_usage'],
      memoryCategories: ['technical', 'troubleshooting'],
      maxMemories: 2,
      relevanceThreshold: 0.5,
      context: { projectType },
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    // Rule 4: User preferences and learning memories
    rules.push({
      id: `rule_${projectId}_user_preferences`,
      name: 'User Preferences & Learning',
      description: 'Attach user preferences and learning memories',
      trigger: {
        type: 'user_query',
        patterns: ['how to', 'what is', 'explain', 'help', 'tutorial'],
        conditions: {},
      },
      scope: 'global',
      memoryTypes: ['user_preference', 'error_solution', 'best_practice'],
      memoryCategories: ['learning', 'preference'],
      maxMemories: 2,
      relevanceThreshold: 0.6,
      context: { projectType },
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    // Rule 5: Workflow-specific memories
    rules.push({
      id: `rule_${projectId}_workflow_specific`,
      name: 'Workflow & Process Memories',
      description:
        'Attach workflow and process-related memories during workflow execution',
      trigger: {
        type: 'workflow_step',
        patterns: [],
        conditions: { hasWorkflow: true },
      },
      scope: 'project',
      memoryTypes: ['workflow_insight', 'template_usage', 'quality_rule'],
      memoryCategories: ['process', 'technical'],
      maxMemories: 3,
      relevanceThreshold: 0.5,
      context: { projectType },
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    // Add project-type specific rules
    if (projectType === 'react') {
      rules.push({
        id: `rule_${projectId}_react_specific`,
        name: 'React-Specific Patterns',
        description: 'Attach React-specific patterns and best practices',
        trigger: {
          type: 'file_path',
          patterns: ['.tsx', '.jsx'],
          conditions: {},
        },
        scope: 'global',
        memoryTypes: ['code_pattern', 'best_practice', 'integration_pattern'],
        memoryCategories: ['technical'],
        maxMemories: 2,
        relevanceThreshold: 0.6,
        context: { projectType: 'react', framework: 'react' },
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (projectType === 'api' || projectType === 'node') {
      rules.push({
        id: `rule_${projectId}_api_specific`,
        name: 'API-Specific Patterns',
        description: 'Attach API development patterns and best practices',
        trigger: {
          type: 'file_path',
          patterns: [
            '/api/',
            '/routes/',
            '/controllers/',
            '.controller.',
            '.route.',
          ],
          conditions: {},
        },
        scope: 'global',
        memoryTypes: ['code_pattern', 'best_practice', 'security_note'],
        memoryCategories: ['technical', 'process'],
        maxMemories: 2,
        relevanceThreshold: 0.6,
        context: { projectType: 'api', framework: 'express' },
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return rules;
  }

  /**
   * Enhance an agent request with relevant memories
   */
  public async enhanceAgentRequest(
    originalRequest: unknown,
    context: AgentRequestContext,
  ): Promise<EnhancedAgentRequest> {
    const relevantMemories: MemorySearchResult[] = [];
    const appliedRules: MemoryRule[] = [];

    // Find applicable rules
    const applicableRules = this.findApplicableRules(context);

    // Apply each rule to gather relevant memories
    for (const rule of applicableRules) {
      if (!rule.enabled) continue;

      const memories = await this.applyRule(rule, context);
      relevantMemories.push(...memories);
      appliedRules.push(rule);
    }

    // Remove duplicates and sort by relevance
    const uniqueMemories = this.deduplicateMemories(relevantMemories);
    const sortedMemories = uniqueMemories.sort(
      (a, b) => b.relevance - a.relevance,
    );

    // Create enhanced prompt
    const enhancedPrompt = this.createEnhancedPrompt(
      originalRequest,
      sortedMemories,
      context,
    );

    return {
      originalRequest,
      context,
      relevantMemories: sortedMemories,
      memoryRules: appliedRules,
      enhancedPrompt,
    };
  }

  /**
   * Find rules that apply to the given context
   */
  private findApplicableRules(context: AgentRequestContext): MemoryRule[] {
    return this.rules.filter((rule) => {
      if (!rule.enabled) return false;

      switch (rule.trigger.type) {
        case 'always':
          return true;

        case 'file_path':
          if (!context.filePath) return false;
          return rule.trigger.patterns.some((pattern) =>
            context.filePath?.includes(pattern),
          );

        case 'project_type':
          return context.projectType === rule.context.projectType;

        case 'workflow_step':
          return context.workflowId && rule.trigger.conditions.hasWorkflow;

        case 'user_query':
          if (!context.userQuery) return false;
          return rule.trigger.patterns.some((pattern) =>
            context.userQuery?.toLowerCase().includes(pattern.toLowerCase()),
          );

        case 'code_analysis':
          return (
            context.analysisType &&
            rule.trigger.conditions.analysisType === context.analysisType
          );

        default:
          return false;
      }
    });
  }

  /**
   * Apply a rule to gather relevant memories
   */
  private async applyRule(
    rule: MemoryRule,
    context: AgentRequestContext,
  ): Promise<MemorySearchResult[]> {
    const searchQuery = this.buildSearchQuery(rule, context);

    const memories = await this.memoryRouter.searchMemories(
      searchQuery,
      rule.scope as 'global' | 'project',
      rule.memoryTypes[0] as MemoryType,
      rule.memoryCategories[0] as MemoryCategory,
      rule.maxMemories,
    );

    // Filter by relevance threshold
    return memories.filter(
      (memory) => memory.relevance >= rule.relevanceThreshold,
    );
  }

  /**
   * Build search query based on rule and context
   */
  private buildSearchQuery(
    rule: MemoryRule,
    context: AgentRequestContext,
  ): string {
    const queryParts: string[] = [];

    // Add context-specific terms
    if (context.filePath) {
      const fileExt = context.filePath.split('.').pop();
      queryParts.push(fileExt);
    }

    if (context.projectType) {
      queryParts.push(context.projectType);
    }

    if (context.userQuery) {
      queryParts.push(context.userQuery);
    }

    if (context.workflowId) {
      queryParts.push('workflow', context.workflowId);
    }

    // Add rule-specific terms
    if (rule.memoryTypes.includes('best_practice')) {
      queryParts.push('best practice');
    }

    if (rule.memoryTypes.includes('security_note')) {
      queryParts.push('security');
    }

    if (rule.memoryTypes.includes('code_pattern')) {
      queryParts.push('pattern', 'example');
    }

    return queryParts.join(' ');
  }

  /**
   * Create enhanced prompt with memories
   */
  private createEnhancedPrompt(
    originalRequest: unknown,
    memories: MemorySearchResult[],
    context: AgentRequestContext,
  ): string {
    if (memories.length === 0) {
      return typeof originalRequest === 'string'
        ? originalRequest
        : JSON.stringify(originalRequest);
    }

    const memoryContext = memories
      .map((result, index) => {
        const memory = result.memory;
        return `${index + 1}. **${memory.type}** (${memory.scope}): ${memory.content}`;
      })
      .join('\n\n');

    const prompt = `
**Relevant Knowledge Base:**
${memoryContext}

**Original Request:**
${typeof originalRequest === 'string' ? originalRequest : JSON.stringify(originalRequest, null, 2)}

**Context:**
- Project: ${context.projectType || 'Unknown'}
- File: ${context.filePath || 'N/A'}
- Agent: ${context.agentType || 'Unknown'}

Please use the relevant knowledge above to provide a more informed and contextual response.
`.trim();

    return prompt;
  }

  /**
   * Deduplicate memories by ID
   */
  private deduplicateMemories(
    memories: MemorySearchResult[],
  ): MemorySearchResult[] {
    const seen = new Set<string>();
    return memories.filter((memory) => {
      if (seen.has(memory.memory.id)) {
        return false;
      }
      seen.add(memory.memory.id);
      return true;
    });
  }

  /**
   * Save a memory rule
   */
  private async saveRule(rule: MemoryRule): Promise<void> {
    // This would typically save to database
    // For now, we'll just add to the in-memory rules
    const existingIndex = this.rules.findIndex((r) => r.id === rule.id);
    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule;
    } else {
      this.rules.push(rule);
    }
  }

  /**
   * Load rules for a project
   */
  private async loadRules(_projectId: string): Promise<void> {
    // This would typically load from database
    // For now, we'll just filter existing rules
    this.rules = this.rules.filter(
      (rule) => rule.context.projectType || rule.scope === 'global',
    );
  }

  /**
   * Generate project ID from path
   */
  private generateProjectId(projectPath: string): string {
    const pathHash = Buffer.from(projectPath)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 16);
    return `proj_${pathHash}`;
  }

  /**
   * Get all rules
   */
  public getRules(): MemoryRule[] {
    return this.rules;
  }

  /**
   * Update a rule
   */
  public async updateRule(rule: MemoryRule): Promise<void> {
    await this.saveRule(rule);
  }

  /**
   * Delete a rule
   */
  public async deleteRule(ruleId: string): Promise<void> {
    this.rules = this.rules.filter((rule) => rule.id !== ruleId);
  }
}
