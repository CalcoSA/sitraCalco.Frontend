import { OfflineExecutionLink, OfflineInventoryContext, OfflinePendingInventoryCount, } from '../models/offline-inventory.model';
import { InventoryCountNumber, InventoryCreate, InventoryStoredCount, } from '../models/inventory.model';
import { OfflineDatabaseService, } from './offline-database.service';
import { inject, Injectable, } from '@angular/core';

@Injectable({
  providedIn: 'root',
})

export class OfflineInventoryService {

  private readonly database = inject(OfflineDatabaseService);

  buildContextKey(userLogin: string, inventoryDate: string, solutionCenterId: number, inventoryConfigurationId: number, sectionId: number): string {
    return [
      userLogin.trim().toLowerCase(),
      inventoryDate,
      solutionCenterId,
      inventoryConfigurationId,
      sectionId,
    ].join('|');
  }

  async prepare(context: OfflineInventoryContext): Promise<void> {
    const existing = await this.database.getContext(context.contextKey);

    await this.database.saveContext({
      ...existing,
      ...context,
      localExecutionId: existing?.localExecutionId ?? context.localExecutionId ?? null,
      pendingCountNumbers: existing?.pendingCountNumbers ?? context.pendingCountNumbers ?? [],
      pendingCounts: existing?.pendingCounts ?? context.pendingCounts ?? {},
    });
  }

  getPreparedInventory(contextKey: string): Promise<OfflineInventoryContext | null> {
    return this.database.getContext(contextKey);
  }

  getPreparedInventories(): Promise<OfflineInventoryContext[]> {
    return this.database.getContexts();
  }

  async getPreparedInventoriesForDate(userLogin: string, inventoryDate: string): Promise<OfflineInventoryContext[]> {
    const contexts = await this.database.getContexts();

    return contexts.filter(
      context =>
        context.userLogin.trim().toLowerCase() === userLogin.trim().toLowerCase() && context.inventoryDate === inventoryDate
    );
  }

  removePreparedInventory(contextKey: string): Promise<void> {
    return this.database.deleteContext(contextKey);
  }

  async queueCount(contextKey: string, request: InventoryCreate): Promise<OfflinePendingInventoryCount> {
    const context = await this.database.getContext(contextKey);

    if (!context) {
      throw new Error('El inventario no fue preparado para trabajar sin conexión.');
    }

    const countNumber = request.countNumber as InventoryCountNumber;

    if (countNumber !== 1 && countNumber !== 2 && countNumber !== 3) {
      throw new Error('El número de conteo no es válido.');
    }

    const localExecutionId = context.localExecutionId ?? crypto.randomUUID();
    const localId = `${localExecutionId}|${countNumber}`;

    const requestToSave:
      InventoryCreate = {
        ...request,
        inventoryExecutionId: request.inventoryExecutionId ?? context.inventoryExecutionId ?? null,
      };

    const now = Date.now();

    const pending:
      OfflinePendingInventoryCount = {
        localId,
        contextKey,
        localExecutionId,
        countNumber,
        request: structuredClone(requestToSave),
        status: 'PENDING_SYNC',
        createdAt: now,
        updatedAt: now,
        lastError: null,
      };

    const pendingCounts = structuredClone(context.pendingCounts ?? {});

    for (const item of request.items) {

      if (!pendingCounts[item.productId]) {
        pendingCounts[item.productId] = {};
      }

      const storedCount:
        InventoryStoredCount = {
          countNumber,
          value: item.countValue,
          open: item.open,
          closed: item.closed,
          multiplicationValue: item.multiplicationValue,
        };

      pendingCounts[item.productId][countNumber] = storedCount;
    }

    const pendingCountNumbers =
      [
        ...new Set([...(context.pendingCountNumbers ?? []), countNumber,]),
      ]
        .filter(
          (number): number is InventoryCountNumber =>
            number === 1 ||
            number === 2 ||
            number === 3
        )
        .sort((a, b) => a - b);

    await this.database.savePendingCount(pending);

    await this.database
      .saveContext({
        ...context,
        localExecutionId,
        pendingCountNumbers,
        pendingCounts,
      });

    return pending;
  }

  getPendingCounts(): Promise<OfflinePendingInventoryCount[]> {
    return this.database.getCountsByStatus('PENDING_SYNC');
  }

  deletePendingCount(localId: string): Promise<void> {
    return this.database.deletePendingCount(localId);
  }

  saveExecutionLink(link: OfflineExecutionLink): Promise<void> {
    return this.database.saveExecutionLink(link);
  }

  getExecutionLink(localExecutionId: string): Promise<OfflineExecutionLink | null> {
    return this.database.getExecutionLink(localExecutionId);
  }
}