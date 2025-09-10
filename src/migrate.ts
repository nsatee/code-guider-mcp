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
  console.log(
    '🔄 Starting migration from file-based storage to hybrid storage...',
  );

  let hybridStorage: HybridStorage | null = null;

  try {
    // Initialize database connection and create tables directly
    console.log('🗄️  Setting up database...');
    const dbConnection = DatabaseConnection.getInstance();

    // Create tables directly since migration files don't exist
    const db = dbConnection.getRawDb();
    // Create tables one by one to avoid syntax issues
    db.exec(`CREATE TABLE IF NOT EXISTS workflows (
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

    db.exec(`CREATE TABLE IF NOT EXISTS templates (
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

    db.exec(`CREATE TABLE IF NOT EXISTS quality_rules (
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

    db.exec(`CREATE TABLE IF NOT EXISTS project_config (
      id TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    console.log('  ✅ Database tables created');

    // Now create the storage instances
    const fileStorage = new LocalStorage();
    hybridStorage = new HybridStorage();

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
    console.log(
      '   You can now use the new hybrid storage with Drizzle ORM + Vector search!',
    );
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
  console.log(
    '🔄 Starting migration from file-based storage to vector storage...',
  );

  const fileStorage = new LocalStorage();
  let vectorStorage: VectorStorage | null = null;

  try {
    vectorStorage = new VectorStorage();
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
    console.log(
      '   You can now use the new AI-powered vector storage features!',
    );
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
