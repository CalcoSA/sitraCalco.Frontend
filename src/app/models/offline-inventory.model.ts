import { InventoryCountNumber, InventoryCreate, InventoryProductDraft, InventorySectionProduct, InventoryStoredCount, InventoryDraft, } from './inventory.model';

export type OfflineSyncStatus =
  | 'PENDING_SYNC'
  | 'SYNCING'
  | 'SYNCED'
  | 'ERROR';

export interface OfflineInventoryContext {
  contextKey: string;
  userLogin: string;
  inventoryDate: string;
  solutionCenterId: number;
  solutionCenterTypeId: number;
  solutionCenterCode: string;
  solutionCenterName: string;
  inventoryConfigurationId: number;
  inventoryConfigurationName: string;
  sectionId: number;
  sectionName: string;
  products: InventorySectionProduct[];
  inventoryExecutionId: string | null;
  savedCountNumbers: InventoryCountNumber[];
  savedCounts: Record<number, Partial<Record<InventoryCountNumber, InventoryStoredCount>>>;
  canViewFullDetail: boolean;
  preparedAt: number;
  localExecutionId?: string | null;
  pendingCountNumbers?: InventoryCountNumber[];
  pendingCounts?: Record<number, Partial<Record<InventoryCountNumber, InventoryStoredCount>>>;
}

export interface OfflineInventoryDraft {
  draftKey: string;
  contextKey: string;
  countNumber: InventoryCountNumber;
  items: Record<number, InventoryProductDraft>;
  createdAt: number;
  updatedAt: number;
}

export interface OfflinePendingInventoryCount {
  localId: string;
  contextKey: string;
  localExecutionId: string;
  countNumber: InventoryCountNumber;
  request: InventoryCreate;
  status: OfflineSyncStatus;
  createdAt: number;
  updatedAt: number;
  lastError: string | null;
}

export interface OfflineExecutionLink {
  localExecutionId: string;
  inventoryExecutionId: string;
  updatedAt: number;
}