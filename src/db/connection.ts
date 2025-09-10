import { join } from 'node:path';
import * as schema from './schema';

// Lazy imports based on runtime
async function getDatabaseAndDrizzle() {
  // Always use Node.js implementation for now
  // This ensures compatibility with both Bun and Node.js
  try {
    const betterSqlite3 = await import('better-sqlite3');
    const nodeDrizzle = await import('drizzle-orm/better-sqlite3');
    const nodeMigrate = await import('drizzle-orm/better-sqlite3/migrator');
    return {
      Database: betterSqlite3.default,
      drizzle: nodeDrizzle.drizzle,
      migrate: nodeMigrate.migrate,
    };
  } catch (error) {
    throw new Error(`Failed to load SQLite implementation: ${error}`);
  }
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: any;
  private drizzle: any;
  private migrate: any;

  private constructor(dbPath: string = '.guidance/guidance.db') {
    // This will be initialized in the async init method
    this.db = null;
    this.drizzle = null;
    this.migrate = null;
  }

  private async init(dbPath: string) {
    const { Database, drizzle, migrate } = await getDatabaseAndDrizzle();
    
    this.db = new Database(dbPath);
    this.drizzle = drizzle(this.db, { schema });
    this.migrate = migrate;

    // Enable WAL mode for better performance
    this.db.exec('PRAGMA journal_mode=WAL;');
    this.db.exec('PRAGMA synchronous=NORMAL;');
    this.db.exec('PRAGMA cache_size=10000;');
    this.db.exec('PRAGMA temp_store=MEMORY;');
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
    this.db.close();
  }
}
