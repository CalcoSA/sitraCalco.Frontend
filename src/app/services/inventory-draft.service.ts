import { InventoryDraft, } from '../models/inventory.model';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})

export class InventoryDraftService {

  private readonly prefix = 'sitracalco:inventory-draft';
  private readonly ttlMilliseconds = 2 * 60 * 60 * 1000;

  buildKey(userName: string, solutionCenterId: number, inventoryConfigurationId: number, sectionId: number, countNumber: number): string {
    return [
      this.prefix,
      userName,
      solutionCenterId,
      inventoryConfigurationId,
      sectionId,
      countNumber,
    ].join(':');
  }

  create(key: string, data: Omit<InventoryDraft, 'startedAt' | 'expiresAt'>): InventoryDraft {
    const now = Date.now();
    const draft: InventoryDraft = {
      ...data,
      startedAt: now,
      expiresAt:
        now + this.ttlMilliseconds,
    };

    localStorage.setItem(key, JSON.stringify(draft));
    return draft;
  }

  get(key: string): InventoryDraft | null {
    const value = localStorage.getItem(key);

    if (!value) {
      return null;
    }

    try {
      const draft = JSON.parse(value) as InventoryDraft;

      if (!draft.expiresAt || Date.now() >= draft.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }

      return draft;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  update(key: string, draft: InventoryDraft): boolean {

    if (Date.now() >= draft.expiresAt) {
      localStorage.removeItem(key);
      return false;
    }

    localStorage.setItem(key, JSON.stringify(draft));
    return true;
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }
}