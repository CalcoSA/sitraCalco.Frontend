export interface InventorySectionProduct {
  solutionCenterProductId: number;
  productId: number;
  imagePath: string | null;
  imageUrl: string | null;
  reference: string;
  productName: string;
  unitOfMeasure: string;
  f122Factor: number | null;
  planId: string | null;
  sortOrder: number;
  unidadInventario?: string | null;
  existencia1?: number | null;
  existencia2?: number | null;
  siesaStockStatus?: 'FOUND' | 'NOT_FOUND' | null;
}

export interface InventoryCreateItem {
  productId: number;
  countValue: number | null;
  open: number | null;
  closed: number | null;
  multiplicationValue: number;
}

export interface InventoryCreate {
  inventoryExecutionId: string | null;
  solutionCenterId: number;
  inventoryConfigurationId: number;
  sectionId: number;
  countNumber: number;
  enteredBy: string;
  items: InventoryCreateItem[];
}

export interface InventoryProductDraft {
  countValue: number | null;
  open: number | null;
  closed: number | null;
  multiplicationValue: number | null;
}

export interface InventoryDraft {
  inventoryExecutionId: string | null;
  solutionCenterId: number;
  inventoryConfigurationId: number;
  sectionId: number;
  countNumber: number;
  startedAt: number;
  expiresAt: number;
  items: Record<number, InventoryProductDraft>;
}

export interface InventorySaveResult {
  inventoryExecutionId: string;
  countNumber: number;
  savedItems: number;
}

export type InventoryCountNumber = 1 | 2 | 3;

export interface InventoryStoredCount {
  countNumber: InventoryCountNumber;
  value: number | null;
  open: number | null;
  closed: number | null;
  multiplicationValue: number | null;
}

export interface InventoryProductStoredCounts {
  productId: number;
  counts: InventoryStoredCount[];
}

export interface InventoryCountsResult {
  inventoryExecutionId: string;
  solutionCenterId: number;
  solutionCenterTypeId: number;
  solutionCenterCode: string;
  solutionCenterName: string;
  inventoryConfigurationId: number;
  inventoryConfigurationName: string;
  sectionId: number;
  sectionName: string;
  countMode: 'SINGLE' | 'OPEN_CLOSED';
  savedCountNumbers: InventoryCountNumber[];
  nextCountNumber: InventoryCountNumber | null;
  canViewFullDetail: boolean;
  items: InventoryProductStoredCounts[];
}

export interface InventoryTodayExecutionResult {
  inventoryExecutionId: string | null;
}