import { OfflineExecutionLink, OfflineInventoryContext, OfflineInventoryDraft, OfflinePendingInventoryCount, OfflineSyncStatus, } from '../models/offline-inventory.model';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})

export class OfflineDatabaseService {

  private readonly databaseName = 'sitracalco_offline';
  private readonly contextStore = 'inventoryContexts';
  private readonly executionStore = 'executionLinks';
  private readonly draftStore = 'inventoryDrafts';
  private readonly pendingStore = 'pendingCounts';
  private readonly databaseVersion = 1;

  private databasePromise: Promise<IDBDatabase> | null = null;

  private openDatabase(): Promise<IDBDatabase> {

    if (this.databasePromise) {
      return this.databasePromise;
    }

    this.databasePromise =
      new Promise<IDBDatabase>(
        (resolve, reject) => {

          const request = indexedDB.open(this.databaseName, this.databaseVersion);

          request.onerror = () => {
            reject(request.error ?? new Error('No fue posible abrir la base de datos offline.'));
          };

          request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(this.contextStore)) {
              const store = database.createObjectStore(this.contextStore, { keyPath: 'contextKey', });

              store.createIndex('userLogin', 'userLogin', { unique: false, });
              store.createIndex('inventoryDate', 'inventoryDate', { unique: false, });
            }

            if (!database.objectStoreNames.contains(this.draftStore)) {
              const store = database.createObjectStore(this.draftStore, { keyPath: 'draftKey', });
              store.createIndex('contextKey', 'contextKey', { unique: false, });
            }

            if (!database.objectStoreNames.contains(this.pendingStore)) {
              const store = database.createObjectStore(this.pendingStore, { keyPath: 'localId', });

              store.createIndex('status', 'status', { unique: false, });
              store.createIndex('contextKey', 'contextKey', { unique: false, });
              store.createIndex('localExecutionId', 'localExecutionId', { unique: false, });
            }

            if (!database.objectStoreNames.contains(this.executionStore)) {
              database.createObjectStore(this.executionStore, { keyPath: 'localExecutionId', });
            }
          };

          request.onsuccess = () => {
            const database = request.result;

            database.onversionchange =
              () => {
                database.close();
                this.databasePromise = null;
              };

            resolve(database);
          };
        }
      );

    return this.databasePromise;
  }

  private async put<T>(storeName: string, value: T): Promise<void> {
    const database = await this.openDatabase();

    return new Promise<void>(
      (resolve, reject) => {

        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        store.put(value);

        transaction.oncomplete =
          () => {
            resolve();
          };

        transaction.onerror =
          () => {
            reject(transaction.error ?? new Error(`No fue posible guardar información en ${storeName}.`));
          };

        transaction.onabort =
          () => {
            reject(transaction.error ?? new Error(`La operación sobre ${storeName} fue cancelada.`));
          };
      }
    );
  }

  private async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    const database = await this.openDatabase();

    return new Promise<T | null>(
      (resolve, reject) => {

        const transaction = database.transaction(storeName, 'readonly');
        const request = transaction.objectStore(storeName).get(key);

        request.onsuccess =
          () => {
            resolve((request.result as T | undefined) ?? null);
          };

        request.onerror =
          () => {
            reject(request.error ?? new Error(`No fue posible consultar ${storeName}.`));
          };
      }
    );
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    const database = await this.openDatabase();

    return new Promise<T[]>(
      (resolve, reject) => {

        const transaction = database.transaction(storeName, 'readonly');
        const request = transaction.objectStore(storeName).getAll();

        request.onsuccess =
          () => {
            resolve((request.result ?? []) as T[]);
          };

        request.onerror =
          () => {
            reject(request.error ?? new Error(`No fue posible consultar ${storeName}.`));
          };
      }
    );
  }

  private async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const database = await this.openDatabase();

    return new Promise<void>(
      (resolve, reject) => {

        const transaction = database.transaction(storeName, 'readwrite');

        transaction.objectStore(storeName).delete(key);

        transaction.oncomplete =
          () => {
            resolve();
          };

        transaction.onerror =
          () => {
            reject(transaction.error ?? new Error(`No fue posible eliminar información de ${storeName}.`));
          };
      }
    );
  }

  saveContext(context: OfflineInventoryContext): Promise<void> {
    return this.put(this.contextStore, context);
  }

  getContext(contextKey: string): Promise<OfflineInventoryContext | null> {
    return this.get<OfflineInventoryContext>(this.contextStore, contextKey);
  }

  getContexts(): Promise<OfflineInventoryContext[]> {
    return this.getAll<OfflineInventoryContext>(this.contextStore);
  }

  deleteContext(contextKey: string): Promise<void> {
    return this.delete(this.contextStore, contextKey);
  }

  saveDraft(draft: OfflineInventoryDraft): Promise<void> {
    return this.put(this.draftStore, draft);
  }

  getDraft(draftKey: string): Promise<OfflineInventoryDraft | null> {
    return this.get<OfflineInventoryDraft>(this.draftStore, draftKey);
  }

  deleteDraft(draftKey: string): Promise<void> {
    return this.delete(this.draftStore, draftKey);
  }

  savePendingCount(pending: OfflinePendingInventoryCount): Promise<void> {
    return this.put(this.pendingStore, pending);
  }

  getPendingCount(localId: string): Promise<OfflinePendingInventoryCount | null> {
    return this.get<OfflinePendingInventoryCount>(this.pendingStore, localId);
  }

  getAllPendingCounts(): Promise<OfflinePendingInventoryCount[]> {
    return this.getAll<OfflinePendingInventoryCount>(this.pendingStore);
  }

  async getCountsByStatus(status: OfflineSyncStatus): Promise<OfflinePendingInventoryCount[]> {
    const counts = await this.getAllPendingCounts();

    return counts
      .filter(count => count.status === status)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  deletePendingCount(localId: string): Promise<void> {
    return this.delete(this.pendingStore, localId);
  }

  saveExecutionLink(link: OfflineExecutionLink): Promise<void> {
    return this.put(this.executionStore, link);
  }

  getExecutionLink(localExecutionId: string): Promise<OfflineExecutionLink | null> {
    return this.get<OfflineExecutionLink>(this.executionStore, localExecutionId);
  }
}