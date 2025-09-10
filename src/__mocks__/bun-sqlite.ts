// Mock for Bun SQLite module for Jest testing
export class Database {
  private closed = false;

  exec(_sql: string) {
    // Mock SQL execution
  }

  prepare(_sql: string) {
    return {
      run: (_params?: any) => ({ changes: 0, lastInsertRowId: 1 }),
      all: (_params?: any) => [],
      get: (_params?: any) => undefined,
    };
  }

  close() {
    this.closed = true;
  }

  isClosed() {
    return this.closed;
  }
}
