import { blob, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const workflows = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  steps: text('steps', { mode: 'json' }).notNull(),
  qualityChecks: text('quality_checks', { mode: 'json' }).notNull(),
  templates: text('templates', { mode: 'json' }),
  tags: text('tags', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  content: text('content').notNull(),
  variables: text('variables', { mode: 'json' }).notNull(),
  description: text('description').notNull(),
  tags: text('tags', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const qualityRules = sqliteTable('quality_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(),
  severity: text('severity').notNull(),
  pattern: text('pattern'),
  check: text('check_rule').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const projectConfig = sqliteTable('project_config', {
  id: text('id').primaryKey(),
  config: text('config', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Vector storage tables (keep existing structure for vector operations)
export const workflowsVector = sqliteTable('workflows_vector', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  content: text('content').notNull(),
  embedding: blob('embedding'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const templatesVector = sqliteTable('templates_vector', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  content: text('content').notNull(),
  embedding: blob('embedding'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const qualityRulesVector = sqliteTable('quality_rules_vector', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  content: text('content').notNull(),
  embedding: blob('embedding'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const codeAnalysis = sqliteTable('code_analysis', {
  id: text('id').primaryKey(),
  filePath: text('file_path').notNull(),
  content: text('content').notNull(),
  embedding: blob('embedding'),
  analysis: text('analysis', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
});

// Memory Management Tables
export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  type: text('type').notNull(),
  scope: text('scope').notNull(),
  category: text('category').notNull(),
  tags: text('tags', { mode: 'json' }).notNull(),
  projectId: text('project_id'),
  context: text('context', { mode: 'json' }).notNull(),
  importance: integer('importance').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  lastAccessed: text('last_accessed').notNull(),
  accessCount: integer('access_count').notNull().default(0),
});

export const memoriesVector = sqliteTable('memories_vector', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  type: text('type').notNull(),
  scope: text('scope').notNull(),
  category: text('category').notNull(),
  tags: text('tags', { mode: 'json' }).notNull(),
  projectId: text('project_id'),
  context: text('context', { mode: 'json' }).notNull(),
  importance: integer('importance').notNull(),
  embedding: blob('embedding'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  lastAccessed: text('last_accessed').notNull(),
  accessCount: integer('access_count').notNull().default(0),
});

// Memory Rules for Agent Requests
export const memoryRules = sqliteTable('memory_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  trigger: text('trigger', { mode: 'json' }).notNull(),
  scope: text('scope').notNull(),
  memoryTypes: text('memory_types', { mode: 'json' }).notNull(),
  memoryCategories: text('memory_categories', { mode: 'json' }).notNull(),
  maxMemories: integer('max_memories').notNull(),
  relevanceThreshold: integer('relevance_threshold').notNull(),
  context: text('context', { mode: 'json' }).notNull(),
  enabled: integer('enabled').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
