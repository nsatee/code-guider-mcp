import {
  Memory,
  MemoryType,
  MemoryScope,
  MemoryCategory,
  MemoryRoutingDecision,
  MemorySearchResult,
} from './types.js';
import { ProjectManager } from './project-manager.js';
import { HybridStorage } from './hybrid-storage.js';

/**
 * Intelligent Memory Router that decides whether to store memories
 * globally or project-specifically based on content analysis
 */
export class MemoryRouter {
  private projectManager: ProjectManager;
  private globalStorage: HybridStorage;
  private projectStorage: HybridStorage | null = null;
  private currentProjectId: string | null = null;

  constructor(projectManager: ProjectManager, globalStorage: HybridStorage) {
    this.projectManager = projectManager;
    this.globalStorage = globalStorage;
  }

  /**
   * Set the current project context
   */
  public setProjectContext(projectPath: string | null): void {
    if (projectPath) {
      this.projectStorage = this.projectManager.getProjectStorage(projectPath);
      this.currentProjectId = this.generateProjectId(projectPath);
    } else {
      this.projectStorage = null;
      this.currentProjectId = null;
    }
  }

  /**
   * Intelligently route a memory to the appropriate storage
   */
  public async routeMemory(
    content: string,
    type: MemoryType,
    category: MemoryCategory,
    context: Record<string, any> = {},
    tags: string[] = []
  ): Promise<MemoryRoutingDecision> {
    const decision = await this.analyzeMemoryRouting(
      content,
      type,
      category,
      context,
      tags
    );

    // Store the memory in the appropriate location
    const memory: Memory = {
      id: this.generateMemoryId(),
      content,
      type,
      scope: decision.scope,
      category,
      tags,
      projectId:
        decision.scope === 'project'
          ? this.currentProjectId || undefined
          : undefined,
      context,
      importance: this.calculateImportance(content, type, category),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
    };

    await this.storeMemory(memory);
    return decision;
  }

  /**
   * Analyze where a memory should be stored
   */
  private async analyzeMemoryRouting(
    content: string,
    type: MemoryType,
    category: MemoryCategory,
    context: Record<string, any>,
    tags: string[]
  ): Promise<MemoryRoutingDecision> {
    const factors: string[] = [];
    let globalScore = 0;
    let projectScore = 0;

    // Factor 1: Memory Type Analysis
    const typeAnalysis = this.analyzeMemoryType(type);
    if (typeAnalysis.isGlobal) {
      globalScore += typeAnalysis.score;
      factors.push(`Type '${type}' suggests global storage`);
    } else if (typeAnalysis.isProject) {
      projectScore += typeAnalysis.score;
      factors.push(`Type '${type}' suggests project storage`);
    }

    // Factor 2: Content Analysis
    const contentAnalysis = this.analyzeContent(content);
    globalScore += contentAnalysis.globalScore;
    projectScore += contentAnalysis.projectScore;
    factors.push(...contentAnalysis.factors);

    // Factor 3: Context Analysis
    const contextAnalysis = this.analyzeContext(context);
    globalScore += contextAnalysis.globalScore;
    projectScore += contextAnalysis.projectScore;
    factors.push(...contextAnalysis.factors);

    // Factor 4: Tag Analysis
    const tagAnalysis = this.analyzeTags(tags);
    globalScore += tagAnalysis.globalScore;
    projectScore += tagAnalysis.projectScore;
    factors.push(...tagAnalysis.factors);

    // Factor 5: Category Analysis
    const categoryAnalysis = this.analyzeCategory(category);
    globalScore += categoryAnalysis.globalScore;
    projectScore += categoryAnalysis.projectScore;
    factors.push(...categoryAnalysis.factors);

    // Factor 6: Project Context
    if (this.currentProjectId) {
      projectScore += 1;
      factors.push('Currently in project context');
    }

    // Make the decision
    const scope: MemoryScope =
      globalScore > projectScore ? 'global' : 'project';
    const confidence =
      Math.abs(globalScore - projectScore) /
      Math.max(globalScore, projectScore, 1);
    const reasoning = this.generateReasoning(
      scope,
      factors,
      globalScore,
      projectScore
    );

    return {
      scope,
      reasoning,
      confidence: Math.min(confidence, 1),
      factors,
    };
  }

  /**
   * Analyze memory type for routing decision
   */
  private analyzeMemoryType(type: MemoryType): {
    isGlobal: boolean;
    isProject: boolean;
    score: number;
  } {
    const globalTypes: MemoryType[] = [
      'best_practice',
      'user_preference',
      'error_solution',
      'performance_tip',
      'security_note',
      'integration_pattern',
    ];

    const projectTypes: MemoryType[] = [
      'project_requirement',
      'architecture_decision',
      'workflow_insight',
      'template_usage',
    ];

    if (globalTypes.includes(type)) {
      return { isGlobal: true, isProject: false, score: 3 };
    } else if (projectTypes.includes(type)) {
      return { isGlobal: false, isProject: true, score: 3 };
    } else {
      // Neutral types like 'code_pattern', 'quality_rule'
      return { isGlobal: false, isProject: false, score: 1 };
    }
  }

  /**
   * Analyze content for routing hints
   */
  private analyzeContent(content: string): {
    globalScore: number;
    projectScore: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let globalScore = 0;
    let projectScore = 0;

    const lowerContent = content.toLowerCase();

    // Global indicators
    const globalIndicators = [
      'general',
      'universal',
      'best practice',
      'standard',
      'common',
      'reusable',
      'template',
      'pattern',
      'guideline',
      'rule',
      'always',
      'never',
      'should',
      'must',
      'recommended',
    ];

    const globalMatches = globalIndicators.filter((indicator) =>
      lowerContent.includes(indicator)
    ).length;

    if (globalMatches > 0) {
      globalScore += globalMatches * 0.5;
      factors.push(`Content contains ${globalMatches} global indicators`);
    }

    // Project-specific indicators
    const projectIndicators = [
      'this project',
      'our project',
      'specific',
      'custom',
      'local',
      'project requirement',
      'business logic',
      'domain',
      'architecture',
      'project structure',
      'team',
      'organization',
    ];

    const projectMatches = projectIndicators.filter((indicator) =>
      lowerContent.includes(indicator)
    ).length;

    if (projectMatches > 0) {
      projectScore += projectMatches * 0.5;
      factors.push(
        `Content contains ${projectMatches} project-specific indicators`
      );
    }

    // File path indicators
    if (lowerContent.includes('/') || lowerContent.includes('\\')) {
      projectScore += 1;
      factors.push('Content contains file paths');
    }

    // Code-specific indicators
    if (
      lowerContent.includes('function') ||
      lowerContent.includes('class') ||
      lowerContent.includes('component') ||
      lowerContent.includes('api')
    ) {
      projectScore += 0.5;
      factors.push('Content appears to be code-specific');
    }

    return { globalScore, projectScore, factors };
  }

  /**
   * Analyze context for routing hints
   */
  private analyzeContext(context: Record<string, any>): {
    globalScore: number;
    projectScore: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let globalScore = 0;
    let projectScore = 0;

    // Project-specific context
    if (context.projectPath || context.projectId || context.projectName) {
      projectScore += 2;
      factors.push('Context contains project information');
    }

    // File-specific context
    if (context.filePath || context.fileName) {
      projectScore += 1;
      factors.push('Context contains file information');
    }

    // User-specific context
    if (context.userId || context.userPreferences) {
      globalScore += 1;
      factors.push('Context contains user information');
    }

    // Framework/technology context
    if (context.framework || context.technology || context.language) {
      globalScore += 0.5;
      factors.push('Context contains technology information');
    }

    return { globalScore, projectScore, factors };
  }

  /**
   * Analyze tags for routing hints
   */
  private analyzeTags(tags: string[]): {
    globalScore: number;
    projectScore: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let globalScore = 0;
    let projectScore = 0;

    const globalTagPatterns = [
      'general',
      'universal',
      'best-practice',
      'standard',
      'common',
      'reusable',
      'template',
      'pattern',
      'guideline',
      'rule',
    ];

    const projectTagPatterns = [
      'project-specific',
      'custom',
      'local',
      'business',
      'domain',
      'architecture',
      'team',
      'organization',
    ];

    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();

      if (globalTagPatterns.some((pattern) => lowerTag.includes(pattern))) {
        globalScore += 0.5;
        factors.push(`Tag '${tag}' suggests global storage`);
      }

      if (projectTagPatterns.some((pattern) => lowerTag.includes(pattern))) {
        projectScore += 0.5;
        factors.push(`Tag '${tag}' suggests project storage`);
      }
    }

    return { globalScore, projectScore, factors };
  }

  /**
   * Analyze category for routing hints
   */
  private analyzeCategory(category: MemoryCategory): {
    globalScore: number;
    projectScore: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let globalScore = 0;
    let projectScore = 0;

    const globalCategories: MemoryCategory[] = [
      'technical',
      'process',
      'preference',
      'learning',
    ];
    const projectCategories: MemoryCategory[] = [
      'troubleshooting',
      'optimization',
    ];

    if (globalCategories.includes(category)) {
      globalScore += 1;
      factors.push(`Category '${category}' suggests global storage`);
    } else if (projectCategories.includes(category)) {
      projectScore += 1;
      factors.push(`Category '${category}' suggests project storage`);
    }

    return { globalScore, projectScore, factors };
  }

  /**
   * Calculate memory importance (1-10 scale)
   */
  private calculateImportance(
    content: string,
    type: MemoryType,
    category: MemoryCategory
  ): number {
    let importance = 5; // Base importance

    // Type-based importance
    const highImportanceTypes: MemoryType[] = [
      'best_practice',
      'security_note',
      'architecture_decision',
    ];
    const lowImportanceTypes: MemoryType[] = [
      'user_preference',
      'template_usage',
    ];

    if (highImportanceTypes.includes(type)) {
      importance += 2;
    } else if (lowImportanceTypes.includes(type)) {
      importance -= 1;
    }

    // Content length factor
    if (content.length > 500) {
      importance += 1;
    } else if (content.length < 100) {
      importance -= 1;
    }

    // Category factor
    if (category === 'learning' || category === 'troubleshooting') {
      importance += 1;
    }

    return Math.max(1, Math.min(10, importance));
  }

  /**
   * Generate reasoning for the routing decision
   */
  private generateReasoning(
    scope: MemoryScope,
    factors: string[],
    globalScore: number,
    projectScore: number
  ): string {
    const scoreDiff = Math.abs(globalScore - projectScore);
    const confidence =
      scoreDiff > 0 ? 'high' : scoreDiff > 1 ? 'medium' : 'low';

    return (
      `Memory routed to ${scope} storage with ${confidence} confidence. ` +
      `Global score: ${globalScore.toFixed(1)}, Project score: ${projectScore.toFixed(1)}. ` +
      `Key factors: ${factors.slice(0, 3).join(', ')}${factors.length > 3 ? '...' : ''}`
    );
  }

  /**
   * Store memory in the appropriate storage
   */
  private async storeMemory(memory: Memory): Promise<void> {
    if (memory.scope === 'global') {
      await this.globalStorage.saveMemory(memory);
    } else if (memory.scope === 'project' && this.projectStorage) {
      await this.projectStorage.saveMemory(memory);
    } else {
      throw new Error('Invalid memory scope or missing storage');
    }
  }

  /**
   * Search memories across both global and project storage
   */
  public async searchMemories(
    query: string,
    scope?: MemoryScope,
    type?: MemoryType,
    category?: MemoryCategory,
    limit: number = 10
  ): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];

    // Search global storage
    if (!scope || scope === 'global') {
      const globalResults = await this.globalStorage.searchMemories(
        query,
        type,
        category,
        limit
      );
      results.push(...globalResults);
    }

    // Search project storage
    if ((!scope || scope === 'project') && this.projectStorage) {
      const projectResults = await this.projectStorage.searchMemories(
        query,
        type,
        category,
        limit
      );
      results.push(...projectResults);
    }

    // Sort by relevance and importance
    return results
      .sort((a, b) => {
        const scoreA = a.relevance * (a.memory.importance / 10);
        const scoreB = b.relevance * (b.memory.importance / 10);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Get memory by ID from appropriate storage
   */
  public async getMemory(
    id: string,
    scope?: MemoryScope
  ): Promise<Memory | null> {
    if (scope === 'global') {
      return await this.globalStorage.getMemory(id);
    } else if (scope === 'project' && this.projectStorage) {
      return await this.projectStorage.getMemory(id);
    } else {
      // Try both storages
      let memory = await this.globalStorage.getMemory(id);
      if (!memory && this.projectStorage) {
        memory = await this.projectStorage.getMemory(id);
      }
      return memory;
    }
  }

  /**
   * Update memory access tracking
   */
  public async updateMemoryAccess(
    id: string,
    scope?: MemoryScope
  ): Promise<void> {
    const memory = await this.getMemory(id, scope);
    if (memory) {
      memory.lastAccessed = new Date().toISOString();
      memory.accessCount += 1;
      await this.storeMemory(memory);
    }
  }

  /**
   * Generate unique memory ID
   */
  private generateMemoryId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
}
