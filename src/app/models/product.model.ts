export interface Product {
  product_id: number;
  product_name: string;
  reference: string;
  unit_of_measure: string;
  plan_id: string | null;
  image_path: string | null;
}

export interface ProductSyncResult {
  processed: number;
}

export interface ProductSearchResult {
  productId: number;
  productName: string;
  reference: string;
  unitOfMeasure: string;
  planId: string | null;
}