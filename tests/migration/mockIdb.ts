/**
 * Lightweight In-Memory IDB Simulation for Migration Unit Tests
 *
 * Implements minimal transactional IDB semantics (open, upgradeneeded,
 * createObjectStore, createIndex, put, get, getAll, transaction commit,
 * transaction abort with state rollback) to verify staging copy, post-import
 * verification, repeat staging idempotency, and transaction abort/retry
 * directly in NodeJS without requiring a browser process.
 */

export interface MockIndex {
  getAll(key: any): { onsuccess?: () => void; onerror?: () => void; result?: any[] };
}

export interface MockObjectStore {
  name: string;
  keyPath: string;
  indexes: Map<string, { name: string; keyPath: string; unique: boolean }>;
  data: Map<any, any>;
  put(value: any): { onsuccess?: () => void; onerror?: () => void; result?: any };
  get(key: any): { onsuccess?: () => void; onerror?: () => void; result?: any };
  createIndex(name: string, keyPath: string, options?: { unique?: boolean }): void;
  index(name: string): MockIndex;
}

export class MockIDBTransaction {
  public oncomplete?: () => void;
  public onerror?: () => void;
  public onabort?: () => void;
  public error?: Error;
  private aborted = false;
  private snapshots = new Map<string, Map<any, any>>();

  private pendingOperations = 0;

  constructor(
    public readonly db: MockIDBDatabase,
    public readonly storeNames: string[],
    public readonly mode: 'readonly' | 'readwrite'
  ) {
    // Snapshot stores for rollback on abort
    for (const name of storeNames) {
      const store = db.getStore(name);
      if (store) {
        this.snapshots.set(name, new Map(store.data));
      }
    }

    // Schedule commit after current turn
    setTimeout(() => {
      if (!this.aborted && this.oncomplete) {
        this.oncomplete();
      }
    }, 5);
  }

  public objectStore(name: string): MockObjectStore {
    const store = this.db.getStore(name);
    if (!store) throw new Error(`Object store "${name}" not found`);

    return {
      name: store.name,
      keyPath: store.keyPath,
      indexes: store.indexes,
      data: store.data,
      put: (value: any) => {
        if (this.aborted) throw new Error('Transaction is already aborted');
        const key = value[store.keyPath];
        store.data.set(key, JSON.parse(JSON.stringify(value)));
        const req: any = { result: key };
        queueMicrotask(() => req.onsuccess?.());
        return req;
      },
      get: (key: any) => {
        const item = store.data.get(key);
        const req: any = { result: item ? JSON.parse(JSON.stringify(item)) : undefined };
        queueMicrotask(() => req.onsuccess?.());
        return req;
      },
      createIndex: (name: string, keyPath: string, options?: any) => {
        store.createIndex(name, keyPath, options);
      },
      index: (indexName: string) => store.index(indexName),
    };
  }

  public abort(reason?: Error): void {
    if (this.aborted) return;
    this.aborted = true;
    this.error = reason ?? new Error('Transaction aborted');

    // Rollback stores to snapshots
    for (const [name, snapshot] of this.snapshots.entries()) {
      const store = this.db.getStore(name);
      if (store) {
        store.data = new Map(snapshot);
      }
    }

    queueMicrotask(() => {
      if (this.onerror) this.onerror();
      if (this.onabort) this.onabort();
    });
  }
}

export class MockIDBDatabase {
  public objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };
  public failNextWriteTransaction = false;
  private stores = new Map<string, {
    name: string;
    keyPath: string;
    indexes: Map<string, { name: string; keyPath: string; unique: boolean }>;
    data: Map<any, any>;
    createIndex: (name: string, keyPath: string, options?: any) => void;
    index: (name: string) => MockIndex;
  }>();

  constructor(public readonly name: string, public readonly version: number) {}

  public getStore(name: string) {
    return this.stores.get(name);
  }

  public createObjectStore(name: string, options: { keyPath: string }): MockObjectStore {
    const indexes = new Map<string, { name: string; keyPath: string; unique: boolean }>();
    const data = new Map<any, any>();

    const storeObj = {
      name,
      keyPath: options.keyPath,
      indexes,
      data,
      createIndex: (indexName: string, keyPath: string, opts?: { unique?: boolean }) => {
        indexes.set(indexName, { name: indexName, keyPath, unique: Boolean(opts?.unique) });
      },
      index: (indexName: string): MockIndex => {
        const idx = indexes.get(indexName);
        if (!idx) throw new Error(`Index "${indexName}" not found on store "${name}"`);
        return {
          getAll: (matchValue: any) => {
            const matches: any[] = [];
            for (const item of data.values()) {
              if (item[idx.keyPath] === matchValue) {
                matches.push(JSON.parse(JSON.stringify(item)));
              }
            }
            const req: any = { result: matches };
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
        };
      },
      put: () => { throw new Error('Cannot put during schema creation outside transaction'); },
      get: () => { throw new Error('Cannot get during schema creation outside transaction'); },
    };

    this.stores.set(name, storeObj);
    return storeObj;
  }

  public transaction(storeNames: string | string[], mode: 'readonly' | 'readwrite' = 'readonly'): any {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = new MockIDBTransaction(this, names, mode);
    if (mode === 'readwrite' && this.failNextWriteTransaction) {
      this.failNextWriteTransaction = false;
      queueMicrotask(() => {
        tx.abort(new Error('Simulated transaction failure'));
      });
    }
    return tx;
  }

  public close(): void {
    // No-op for mock
  }
}

export class MockIDBFactory {
  private databases = new Map<string, MockIDBDatabase>();
  public failNextWriteTransaction = false;

  public getDatabase(name: string): MockIDBDatabase | undefined {
    return this.databases.get(name);
  }

  public open(name: string, version: number): any {
    const req: any = {};

    queueMicrotask(() => {
      let db = this.databases.get(name);
      const isNew = !db;

      if (!db) {
        db = new MockIDBDatabase(name, version);
        this.databases.set(name, db);
      }

      if (this.failNextWriteTransaction) {
        db.failNextWriteTransaction = true;
        this.failNextWriteTransaction = false;
      }

      req.result = db;

      if (isNew && req.onupgradeneeded) {
        req.onupgradeneeded({
          oldVersion: 0,
          newVersion: version,
          target: req,
        });
      }

      if (req.onsuccess) {
        req.onsuccess({ target: req });
      }
    });

    return req;
  }
}
