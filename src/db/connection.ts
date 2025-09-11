import { join } from 'node:path';
import * as schema from './schema.js';

// Lazy imports based on runtime
async function getDatabaseAndDrizzle() {
  // Use LibSQL for cross-platform compatibility
  try {
    const { createClient } = await import('@libsql/client');
    const libsqlDrizzle = await import('drizzle-orm/libsql');
    const libsqlMigrate = await import('drizzle-orm/libsql/migrator');
    return {
      createClient,
      drizzle: libsqlDrizzle.drizzle,
      migrate: libsqlMigrate.migrate,
    };
  } catch (error) {
    throw new Error(`Failed to load LibSQL implementation: ${error}`);
  }
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: any;
  private drizzle: any;
  private migrate: any;

  private constructor(_dbPath: string = '.guidance/guidance.db') {
    // This will be initialized in the async init method
    this.db = null;
    this.drizzle = null;
    this.migrate = null;
  }

  private async init(dbPath: string) {
    const { createClient, drizzle, migrate } = await getDatabaseAndDrizzle();

    // Ensure the directory exists before creating the database
    const { dirname } = await import('node:path');
    const { mkdirSync, existsSync } = await import('node:fs');
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    // Create LibSQL client with local file database
    this.db = createClient({
      url: `file:${dbPath}`,
    });
    this.drizzle = drizzle(this.db, { schema });
    this.migrate = migrate;

    // Enable WAL mode for better performance
    await this.db.execute('PRAGMA journal_mode=WAL;');
    await this.db.execute('PRAGMA synchronous=NORMAL;');
    await this.db.execute('PRAGMA cache_size=10000;');
    await this.db.execute('PRAGMA temp_store=MEMORY;');
  }

  public static async getInstance(dbPath?: string): Promise<DatabaseConnection> {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(dbPath);
      await DatabaseConnection.instance.init(dbPath || '.guidance/guidance.db');
    }
    return DatabaseConnection.instance;
  }

  public getDrizzle() {
    return this.drizzle;
  }

  public getRawDb(): any {
    return this.db;
  }

  public async runMigrations() {
    try {
      await this.migrate(this.drizzle, {
        migrationsFolder: join(process.cwd(), 'drizzle'),
      });
    } catch (error) {
      console.warn('Migration failed, continuing with existing schema:', error);
    }
  }

  public close() {
    // LibSQL client doesn't need explicit closing
    // The connection will be cleaned up automatically
  }
}
