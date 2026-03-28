declare module 'better-sqlite3' {
  interface RunResult {
    changes: number;
    lastInsertRowid?: number | bigint;
  }
  interface Statement {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    iterate?(...params: unknown[]): IterableIterator<unknown>;
  }
  class Database {
    constructor(filename: string, options?: Record<string, unknown>);
    prepare(sql: string): Statement;
    exec(sql: string): this;
    transaction<T>(fn: () => T): () => T;
    close(): void;
    pragma(pragma: string, simple?: boolean): unknown;
  }
  export = Database;
}
