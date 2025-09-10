import { and, count, desc, eq, like, or } from 'drizzle-orm';
import type {
  CodeTemplate,
  Memory,
  MemoryCategory,
  MemoryRule,
  MemoryRuleTrigger,
  MemoryType,
  ProjectConfig,
  QualityRule,
  Workflow,
} from '../types';
import { DatabaseConnection } from './connection';
import {
  memories,
  memoryRules,
  projectConfig,
  qualityRules,
  templates,
  workflows,
} from './schema';

export class DrizzleStorage {
  private db: ReturnType<DatabaseConnection['getDrizzle']>;

  constructor(db: ReturnType<DatabaseConnection['getDrizzle']>) {
    this.db = db;
  }

  static async create(): Promise<DrizzleStorage> {
    const connection = await DatabaseConnection.getInstance();
    return new DrizzleStorage(connection.getDrizzle());
  }

  // Workflow operations
  async saveWorkflow(workflow: Workflow): Promise<void> {
    await this.db
      .insert(workflows)
      .values({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        steps: workflow.steps,
        qualityChecks: workflow.qualityChecks,
        templates: workflow.templates || null,
        tags: workflow.tags,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      })
      .onConflictDoUpdate({
        target: workflows.id,
        set: {
          name: workflow.name,
          description: workflow.description,
          steps: workflow.steps,
          qualityChecks: workflow.qualityChecks,
          templates: workflow.templates || null,
          tags: workflow.tags,
          updatedAt: workflow.updatedAt,
        },
      });
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    const result = await this.db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      steps: row.steps as Workflow['steps'],
      qualityChecks: row.qualityChecks as Workflow['qualityChecks'],
      templates: (row.templates as Workflow['templates']) || {},
      tags: row.tags as Workflow['tags'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listWorkflows(): Promise<Workflow[]> {
    const results = await this.db
      .select()
      .from(workflows)
      .orderBy(desc(workflows.createdAt));

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      steps: row.steps as Workflow['steps'],
      qualityChecks: row.qualityChecks as Workflow['qualityChecks'],
      templates: (row.templates as Workflow['templates']) || {},
      tags: row.tags as Workflow['tags'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.db.delete(workflows).where(eq(workflows.id, id));
  }

  async searchWorkflows(query: string): Promise<Workflow[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const results = await this.db
      .select()
      .from(workflows)
      .where(
        or(
          like(workflows.name, searchTerm),
          like(workflows.description, searchTerm)
        )
      )
      .orderBy(desc(workflows.createdAt));

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      steps: row.steps as Workflow['steps'],
      qualityChecks: row.qualityChecks as Workflow['qualityChecks'],
      templates: (row.templates as Workflow['templates']) || {},
      tags: row.tags as Workflow['tags'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  // Template operations
  async saveTemplate(template: CodeTemplate): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .insert(templates)
      .values({
        id: template.id,
        name: template.name,
        type: template.type,
        content: template.content,
        variables: template.variables,
        description: template.description,
        tags: template.tags,
        createdAt: template.createdAt || now,
        updatedAt: template.updatedAt || now,
      })
      .onConflictDoUpdate({
        target: templates.id,
        set: {
          name: template.name,
          type: template.type,
          content: template.content,
          variables: template.variables,
          description: template.description,
          tags: template.tags,
          updatedAt: template.updatedAt || now,
        },
      });
  }

  async getTemplate(id: string): Promise<CodeTemplate | null> {
    const result = await this.db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      type: row.type as CodeTemplate['type'],
      content: row.content,
      variables: row.variables as CodeTemplate['variables'],
      description: row.description,
      tags: row.tags as CodeTemplate['tags'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listTemplates(): Promise<CodeTemplate[]> {
    const results = await this.db
      .select()
      .from(templates)
      .orderBy(desc(templates.createdAt));

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as CodeTemplate['type'],
      content: row.content,
      variables: row.variables as CodeTemplate['variables'],
      description: row.description,
      tags: row.tags as CodeTemplate['tags'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async searchTemplates(query: string): Promise<CodeTemplate[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const results = await this.db
      .select()
      .from(templates)
      .where(
        or(
          like(templates.name, searchTerm),
          like(templates.description, searchTerm)
        )
      )
      .orderBy(desc(templates.createdAt));

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as CodeTemplate['type'],
      content: row.content,
      variables: row.variables as CodeTemplate['variables'],
      description: row.description,
      tags: row.tags as CodeTemplate['tags'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  // Quality rules operations
  async saveQualityRule(rule: QualityRule): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .insert(qualityRules)
      .values({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        type: rule.type,
        severity: rule.severity,
        pattern: rule.pattern || null,
        check: rule.check,
        createdAt: rule.createdAt || now,
        updatedAt: rule.updatedAt || now,
      })
      .onConflictDoUpdate({
        target: qualityRules.id,
        set: {
          name: rule.name,
          description: rule.description,
          type: rule.type,
          severity: rule.severity,
          pattern: rule.pattern || null,
          check: rule.check,
          updatedAt: rule.updatedAt || now,
        },
      });
  }

  async getQualityRule(id: string): Promise<QualityRule | null> {
    const result = await this.db
      .select()
      .from(qualityRules)
      .where(eq(qualityRules.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type as QualityRule['type'],
      severity: row.severity as QualityRule['severity'],
      pattern: row.pattern ?? undefined,
      check: row.check,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listQualityRules(): Promise<QualityRule[]> {
    const results = await this.db
      .select()
      .from(qualityRules)
      .orderBy(desc(qualityRules.createdAt));

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type as QualityRule['type'],
      severity: row.severity as QualityRule['severity'],
      pattern: row.pattern ?? undefined,
      check: row.check,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  // Project configuration
  async saveProjectConfig(config: ProjectConfig): Promise<void> {
    await this.db
      .insert(projectConfig)
      .values({
        id: 'default',
        config: config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: projectConfig.id,
        set: {
          config: config,
          updatedAt: new Date().toISOString(),
        },
      });
  }

  async getProjectConfig(): Promise<ProjectConfig | null> {
    const result = await this.db
      .select()
      .from(projectConfig)
      .where(eq(projectConfig.id, 'default'))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0]?.config as ProjectConfig;
  }

  // Memory operations
  async saveMemory(memory: Memory): Promise<void> {
    await this.db
      .insert(memories)
      .values({
        id: memory.id,
        content: memory.content,
        type: memory.type,
        scope: memory.scope,
        category: memory.category,
        tags: memory.tags,
        projectId: memory.projectId || null,
        context: memory.context,
        importance: memory.importance,
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
        lastAccessed: memory.lastAccessed,
        accessCount: memory.accessCount,
      })
      .onConflictDoUpdate({
        target: memories.id,
        set: {
          content: memory.content,
          type: memory.type,
          scope: memory.scope,
          category: memory.category,
          tags: memory.tags,
          projectId: memory.projectId || null,
          context: memory.context,
          importance: memory.importance,
          updatedAt: memory.updatedAt,
          lastAccessed: memory.lastAccessed,
          accessCount: memory.accessCount,
        },
      });
  }

  async getMemory(id: string): Promise<Memory | null> {
    const result = await this.db
      .select()
      .from(memories)
      .where(eq(memories.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      content: row.content,
      type: row.type as MemoryType,
      scope: row.scope as 'global' | 'project',
      category: row.category as MemoryCategory,
      tags: row.tags as string[],
      projectId: row.projectId || undefined,
      context: row.context as Record<string, unknown>,
      importance: row.importance,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastAccessed: row.lastAccessed,
      accessCount: row.accessCount,
    };
  }

  async listMemories(
    type?: MemoryType,
    category?: MemoryCategory,
    scope?: 'global' | 'project',
    limit: number = 50
  ): Promise<Memory[]> {
    let query = this.db.select().from(memories);

    const conditions: any[] = [];
    if (type) {
      conditions.push(eq(memories.type, type));
    }
    if (category) {
      conditions.push(eq(memories.category, category));
    }
    if (scope) {
      conditions.push(eq(memories.scope, scope));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query
      .orderBy(desc(memories.importance), desc(memories.lastAccessed))
      .limit(limit);

    return result.map((row) => ({
      id: row.id,
      content: row.content,
      type: row.type as MemoryType,
      scope: row.scope as 'global' | 'project',
      category: row.category as MemoryCategory,
      tags: row.tags as string[],
      projectId: row.projectId || undefined,
      context: row.context as Record<string, unknown>,
      importance: row.importance,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastAccessed: row.lastAccessed,
      accessCount: row.accessCount,
    }));
  }

  async updateMemory(memory: Memory): Promise<void> {
    await this.db
      .update(memories)
      .set({
        content: memory.content,
        type: memory.type,
        scope: memory.scope,
        category: memory.category,
        tags: memory.tags,
        projectId: memory.projectId || null,
        context: memory.context,
        importance: memory.importance,
        updatedAt: memory.updatedAt,
        lastAccessed: memory.lastAccessed,
        accessCount: memory.accessCount,
      })
      .where(eq(memories.id, memory.id));
  }

  async deleteMemory(id: string): Promise<void> {
    await this.db.delete(memories).where(eq(memories.id, id));
  }

  async getMemoryStats(): Promise<{
    total: number;
    byType: Record<MemoryType, number>;
    byCategory: Record<MemoryCategory, number>;
    byScope: Record<'global' | 'project', number>;
  }> {
    const totalResult = await this.db.select({ count: count() }).from(memories);
    const total = totalResult[0]?.count || 0;

    // Get counts by type
    const typeResults = await this.db
      .select({ type: memories.type, count: count() })
      .from(memories)
      .groupBy(memories.type);

    const byType = typeResults.reduce((acc, row) => {
      acc[row.type as MemoryType] = row.count;
      return acc;
    }, {} as Record<MemoryType, number>);

    // Get counts by category
    const categoryResults = await this.db
      .select({ category: memories.category, count: count() })
      .from(memories)
      .groupBy(memories.category);

    const byCategory = categoryResults.reduce((acc, row) => {
      acc[row.category as MemoryCategory] = row.count;
      return acc;
    }, {} as Record<MemoryCategory, number>);

    // Get counts by scope
    const scopeResults = await this.db
      .select({ scope: memories.scope, count: count() })
      .from(memories)
      .groupBy(memories.scope);

    const byScope = scopeResults.reduce((acc, row) => {
      acc[row.scope as 'global' | 'project'] = row.count;
      return acc;
    }, {} as Record<'global' | 'project', number>);

    return { total, byType, byCategory, byScope };
  }

  // Memory Rule operations
  async saveMemoryRule(rule: MemoryRule): Promise<void> {
    await this.db
      .insert(memoryRules)
      .values({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        scope: rule.scope,
        memoryTypes: rule.memoryTypes,
        memoryCategories: rule.memoryCategories,
        maxMemories: rule.maxMemories,
        relevanceThreshold: rule.relevanceThreshold,
        context: rule.context,
        enabled: rule.enabled ? 1 : 0,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      })
      .onConflictDoUpdate({
        target: memoryRules.id,
        set: {
          name: rule.name,
          description: rule.description,
          trigger: rule.trigger,
          scope: rule.scope,
          memoryTypes: rule.memoryTypes,
          memoryCategories: rule.memoryCategories,
          maxMemories: rule.maxMemories,
          relevanceThreshold: rule.relevanceThreshold,
          context: rule.context,
          enabled: rule.enabled ? 1 : 0,
          updatedAt: rule.updatedAt,
        },
      });
  }

  async getMemoryRule(id: string): Promise<MemoryRule | null> {
    const result = await this.db
      .select()
      .from(memoryRules)
      .where(eq(memoryRules.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      trigger: row.trigger as MemoryRuleTrigger,
      scope: row.scope as 'global' | 'project',
      memoryTypes: row.memoryTypes as MemoryType[],
      memoryCategories: row.memoryCategories as MemoryCategory[],
      maxMemories: row.maxMemories,
      relevanceThreshold: row.relevanceThreshold,
      context: row.context as Record<string, unknown>,
      enabled: row.enabled === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listMemoryRules(scope?: 'global' | 'project'): Promise<MemoryRule[]> {
    let query = this.db.select().from(memoryRules);

    if (scope) {
      query = query.where(eq(memoryRules.scope, scope)) as any;
    }

    const result = await query.orderBy(desc(memoryRules.createdAt));

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      trigger: row.trigger as MemoryRuleTrigger,
      scope: row.scope as 'global' | 'project',
      memoryTypes: row.memoryTypes as MemoryType[],
      memoryCategories: row.memoryCategories as MemoryCategory[],
      maxMemories: row.maxMemories,
      relevanceThreshold: row.relevanceThreshold,
      context: row.context as Record<string, unknown>,
      enabled: row.enabled === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async updateMemoryRule(rule: MemoryRule): Promise<void> {
    await this.db
      .update(memoryRules)
      .set({
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        scope: rule.scope,
        memoryTypes: rule.memoryTypes,
        memoryCategories: rule.memoryCategories,
        maxMemories: rule.maxMemories,
        relevanceThreshold: rule.relevanceThreshold,
        context: rule.context,
        enabled: rule.enabled ? 1 : 0,
        updatedAt: rule.updatedAt,
      })
      .where(eq(memoryRules.id, rule.id));
  }

  async deleteMemoryRule(id: string): Promise<void> {
    await this.db.delete(memoryRules).where(eq(memoryRules.id, id));
  }
}
