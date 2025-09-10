// Mock for Bun SQLite module for Jest testing
export class Database {
  private closed = false;
  private data: Map<string, any[]> = new Map();

  exec(_sql: string) {
    // Mock SQL execution
  }

  prepare(sql: string) {
    return {
      run: (params?: any) => {
        // Store data for SELECT queries
        if (sql.includes('INSERT INTO')) {
          const tableName = this.extractTableName(sql);
          if (!this.data.has(tableName)) {
            this.data.set(tableName, []);
          }
          const tableData = this.data.get(tableName) || [];
          const newRecord = { ...params, id: `mock-${Date.now()}` };
          tableData.push(newRecord);
          return { changes: 1, lastInsertRowId: 1 };
        }
        return { changes: 0, lastInsertRowId: 1 };
      },
      all: (_params?: any) => {
        const tableName = this.extractTableName(sql);
        return this.data.get(tableName) || [];
      },
      get: (params?: any) => {
        const tableName = this.extractTableName(sql);
        const tableData = this.data.get(tableName) || [];
        return tableData.find((record) => record.id === params?.id) || null;
      },
      values: (_params?: any) => [],
    };
  }

  private extractTableName(sql: string): string {
    const match = sql.match(/FROM\s+(\w+)/i) || sql.match(/INTO\s+(\w+)/i);
    return match?.[1] || 'default';
  }

  close() {
    this.closed = true;
  }

  isClosed() {
    return this.closed;
  }
}
