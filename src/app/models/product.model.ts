export interface Product {
  product_id: number;
  product_name: string;
  reference: string;
  unit_of_measure: string;
  plan_id: string | null;
  image_path: string | null;
  imageUrl: string | null;
}

export interface ProductSyncResult {
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
  createdProducts: unknown[];
  updatedProducts: unknown[];
}

export interface ProductSearchResult {
  productId: number;
  productName: string;
  reference: string;
  unitOfMeasure: string;
  planId: string | null;
  image_path: string | null;
  imageUrl: string | null;
}

export interface ProductImageUpdateResult {
  productId: number;
  imagePath: string;
}

export interface ProductImageDeleteResult {
  productId: number;
}