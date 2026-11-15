import { OfflineExecutionLink, OfflinePendingInventoryCount, } from '../models/offline-inventory.model';
import { OfflineDatabaseService, } from './offline-database.service';
import { effect, inject, Injectable, signal, } from '@angular/core';
import { NetworkStatusService, } from './network-status.service';
import { InventoryCreate, } from '../models/inventory.model';
import { InventoryService, } from './inventory.service';
import { firstValueFrom, } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class OfflineInventorySyncService {

  private readonly networkStatusService = inject(NetworkStatusService);
  private readonly inventoryService = inject(InventoryService);
  private readonly database = inject(OfflineDatabaseService);

  readonly synchronizing = signal(false);

  constructor() {    
    effect(() => {
      const isOnline = this.networkStatusService.isOnline();

      if (isOnline) {
        void this.synchronizePendingCounts();
      }
    });
  }

  async synchronizePendingCounts(): Promise<void> {

    if (!this.networkStatusService.isOnline() || this.synchronizing()) {
      return;
    }

    this.synchronizing.set(true);

    try {
      const pendingCounts = [
        ...await this.database.getCountsByStatus('PENDING_SYNC'),
        ...await this.database.getCountsByStatus('ERROR'),
      ];

      if (pendingCounts.length === 0) {
        return;
      }

      pendingCounts.sort(
        (a, b) => {

          if (a.localExecutionId === b.localExecutionId) {
            return (a.countNumber - b.countNumber);
          }

          return (a.createdAt - b.createdAt);
        }
      );

      const groups = new Map<string, OfflinePendingInventoryCount[]>();

      for (const pending of pendingCounts) {
        const current = groups.get(pending.localExecutionId) ?? [];
        current.push(pending);
        groups.set(pending.localExecutionId, current);
      }

      for (const counts of groups.values()) {

        if (!this.networkStatusService.isOnline()) {
          break;
        }

        await this.synchronizeExecution(counts);
      }
    }
    finally {
      this.synchronizing.set(false);
    }
  }

  private async synchronizeExecution(counts: OfflinePendingInventoryCount[]): Promise<void> {

    if (counts.length === 0) {
      return;
    }

    counts.sort((a, b) => a.countNumber - b.countNumber);

    const localExecutionId = counts[0].localExecutionId;

    let executionLink = await this.database.getExecutionLink(localExecutionId);

    for (const pending of counts) {

      if (!this.networkStatusService.isOnline()) {
        return;
      }

      if (!executionLink && pending.countNumber !== 1) {
        await this.markAsError(pending, 'No existe todavía un inventoryExecutionId para esta ejecución.');
        return;
      }

      const syncingPending:
        OfflinePendingInventoryCount = {
          ...pending,
          status: 'SYNCING',
          updatedAt: Date.now(),
          lastError: null,
        };

      await this.database.savePendingCount(syncingPending);

      const request:
        InventoryCreate = {
          ...pending.request,
          inventoryExecutionId: executionLink ?.inventoryExecutionId ?? null,
        };

      try {
        const response = await firstValueFrom(this.inventoryService.create(request));

        if (!response.isSuccess || !response.result) {
          throw new Error(response.message || 'El backend no pudo guardar el conteo.');
        }

        const backendExecutionId = response.result.inventoryExecutionId;

        if (!backendExecutionId) {
          throw new Error('El backend no devolvió el inventoryExecutionId.');
        }

        if (!executionLink) {
          const newExecutionLink: OfflineExecutionLink = {
            localExecutionId,
            inventoryExecutionId: backendExecutionId,
            updatedAt: Date.now(),
          };

          await this.database.saveExecutionLink(newExecutionLink);

          executionLink = newExecutionLink;
        }

        await this.database.deletePendingCount(pending.localId);
      }
      catch (error) {
        await this.markAsError(pending, this.getErrorMessage(error));
        return;
      }
    }
  }

  private async markAsError(pending: OfflinePendingInventoryCount, message: string): Promise<void> {
    await this.database.savePendingCount({
      ...pending,
      status: 'ERROR',
      updatedAt: Date.now(),
      lastError: message,
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    const httpError = error as { error?: { message?: string; }; message?: string; };

    return (httpError.error?.message ?? httpError.message ?? 'Ocurrió un error durante la sincronización.');
  }
}