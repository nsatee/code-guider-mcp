declare module 'bun:sqlite' {
  export class Database {
    constructor(filename: string);
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): Statement;
    transaction(fn: () => void): void;
  }

  export interface Statement {
    run(...params: unknown[]): { changes: number; lastInsertRowId: number };
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
    iterate(...params: unknown[]): IterableIterator<Record<string, unknown>>;
  }
}
