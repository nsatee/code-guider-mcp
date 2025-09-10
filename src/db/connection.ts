import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from './schema';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: Database;
  private drizzle: ReturnType<typeof drizzle>;

  private constructor(dbPath: string = '.guidance/guidance.db') {
    this.db = new Database(dbPath);
    this.drizzle = drizzle(this.db, { schema });

    // Enable WAL mode for better performance
    this.db.exec('PRAGMA journal_mode=WAL;');
    this.db.exec('PRAGMA synchronous=NORMAL;');
    this.db.exec('PRAGMA cache_size=10000;');
    this.db.exec('PRAGMA temp_store=MEMORY;');
  }

  public static getInstance(dbPath?: string): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(dbPath);
    }
    return DatabaseConnection.instance;
  }

  public getDrizzle() {
    return this.drizzle;
  }

  public getRawDb(): Database {
    return this.db;
  }

  public async runMigrations() {
    try {
      await migrate(this.drizzle, {
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
