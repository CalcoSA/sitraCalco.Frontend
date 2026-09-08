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