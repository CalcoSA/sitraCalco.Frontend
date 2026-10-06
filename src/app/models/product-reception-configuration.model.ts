export interface ProductReceptionConfiguration {
  product_configuration_id: number;
  product_id: number;
  minimum_shelf_life_days: number | null;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface CreateProductReceptionConfiguration {
  product_id: number;
  minimum_shelf_life_days: number | null;
}

export interface UpdateProductReceptionConfiguration {
  minimum_shelf_life_days: number | null;
}