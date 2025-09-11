#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { DatabaseConnection } from './db/connection.js';
import { HybridStorage } from './hybrid-storage.js';
import { LocalStorage } from './storage.js';
import { VectorStorage } from './vector-storage.js';

/**
 * Migration script to convert from file-based storage to hybrid storage (Drizzle + Vector)
 */
async function migrateToHybridStorage(): Promise<void> {
  console.log('🔄 Starting migration from file-based storage to hybrid storage...');

  let hybridStorage: HybridStorage | null = null;

  try {
    // Initialize database connection and create tables directly
    console.log('🗄️  Setting up database...');
    const dbConnection = await DatabaseConnection.getInstance();

    // Create tables directly since migration files don't exist
    const db = dbConnection.getRawDb();
    // Create tables one by one to avoid syntax issues
    await db.execute(`CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      steps TEXT NOT NULL,
      quality_checks TEXT NOT NULL,
      templates TEXT,
      tags TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      variables TEXT NOT NULL,
      description TEXT NOT NULL,
      tags TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS quality_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      pattern TEXT,
      check_rule TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS project_config (
      id TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    // Create vector storage tables
    await db.execute(`CREATE TABLE IF NOT EXISTS workflows_vector (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS templates_vector (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS quality_rules_vector (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS code_analysis (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      analysis TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`);

    // Create memory management tables
    await db.execute(`CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      scope TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT NOT NULL,
      project_id TEXT,
      context TEXT NOT NULL,
      importance INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_accessed TEXT NOT NULL,
      access_count INTEGER NOT NULL DEFAULT 0
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS memories_vector (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      scope TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT NOT NULL,
      project_id TEXT,
      context TEXT NOT NULL,
      importance INTEGER NOT NULL,
      embedding BLOB,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_accessed TEXT NOT NULL,
      access_count INTEGER NOT NULL DEFAULT 0
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS memory_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      trigger TEXT NOT NULL,
      scope TEXT NOT NULL,
      memory_types TEXT NOT NULL,
      memory_categories TEXT NOT NULL,
      max_memories INTEGER NOT NULL,
      relevance_threshold INTEGER NOT NULL,
      context TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    console.log('  ✅ Database tables created');

    // Now create the storage instances
    const fileStorage = new LocalStorage();
    hybridStorage = await HybridStorage.create();

    // Check if hybrid storage already exists and has data
    const existingWorkflows = await hybridStorage.listWorkflows();
    if (existingWorkflows.length > 0) {
      console.log('⚠️  Hybrid storage already has data. Skipping migration.');
      return;
    }

    // Migrate workflows
    console.log('📋 Migrating workflows...');
    const workflows = await fileStorage.listWorkflows();
    for (const workflow of workflows) {
      await hybridStorage.saveWorkflow(workflow);
      console.log(`  ✅ Migrated workflow: ${workflow.name}`);
    }

    // Migrate templates
    console.log('📝 Migrating templates...');
    const templates = await fileStorage.listTemplates();
    for (const template of templates) {
      await hybridStorage.saveTemplate(template);
      console.log(`  ✅ Migrated template: ${template.name}`);
    }

    // Migrate quality rules
    console.log('✅ Migrating quality rules...');
    const rules = await fileStorage.listQualityRules();
    for (const rule of rules) {
      await hybridStorage.saveQualityRule(rule);
      console.log(`  ✅ Migrated rule: ${rule.name}`);
    }

    // Migrate project config
    console.log('⚙️  Migrating project configuration...');
    const config = await fileStorage.getProjectConfig();
    if (config) {
      await hybridStorage.saveProjectConfig(config);
      console.log('  ✅ Migrated project configuration');
    }

    console.log('🎉 Migration completed successfully!');
    console.log('📊 Summary:');
    console.log(`  - Workflows: ${workflows.length}`);
    console.log(`  - Templates: ${templates.length}`);
    console.log(`  - Quality Rules: ${rules.length}`);
    console.log(`  - Project Config: ${config ? 'Yes' : 'No'}`);

    console.log('\n💡 The old file-based storage is preserved for backup.');
    console.log('   You can now use the new hybrid storage with Drizzle ORM + Vector search!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (hybridStorage) {
      await hybridStorage.close();
    }
  }
}

// Legacy migration function for backward compatibility
async function migrateToVectorStorage(): Promise<void> {
  console.log('🔄 Starting migration from file-based storage to vector storage...');

  const fileStorage = new LocalStorage();
  let vectorStorage: VectorStorage | null = null;

  try {
    vectorStorage = await VectorStorage.create('.guidance/guidance.db');
    // Check if vector storage already exists
    if (existsSync('.guidance/guidance.db')) {
      console.log('⚠️  Vector storage already exists. Skipping migration.');
      return;
    }

    // Migrate workflows
    console.log('📋 Migrating workflows...');
    const workflows = await fileStorage.listWorkflows();
    for (const workflow of workflows) {
      await vectorStorage.saveWorkflow(workflow);
      console.log(`  ✅ Migrated workflow: ${workflow.name}`);
    }

    // Migrate templates
    console.log('📝 Migrating templates...');
    const templates = await fileStorage.listTemplates();
    for (const template of templates) {
      await vectorStorage.saveTemplate(template);
      console.log(`  ✅ Migrated template: ${template.name}`);
    }

    // Migrate quality rules
    console.log('✅ Migrating quality rules...');
    const rules = await fileStorage.listQualityRules();
    for (const rule of rules) {
      await vectorStorage.saveQualityRule(rule);
      console.log(`  ✅ Migrated rule: ${rule.name}`);
    }

    // Migrate project config
    console.log('⚙️  Migrating project configuration...');
    const config = await fileStorage.getProjectConfig();
    if (config) {
      await vectorStorage.saveProjectConfig(config);
      console.log('  ✅ Migrated project configuration');
    }

    console.log('🎉 Migration completed successfully!');
    console.log('📊 Summary:');
    console.log(`  - Workflows: ${workflows.length}`);
    console.log(`  - Templates: ${templates.length}`);
    console.log(`  - Quality Rules: ${rules.length}`);
    console.log(`  - Project Config: ${config ? 'Yes' : 'No'}`);

    console.log('\n💡 The old file-based storage is preserved for backup.');
    console.log('   You can now use the new AI-powered vector storage features!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (vectorStorage) {
      vectorStorage.close();
    }
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToHybridStorage().catch(console.error);
}

export { migrateToHybridStorage, migrateToVectorStorage };
