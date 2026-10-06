export interface ProductTemperatureConfiguration {
  temperature_configuration_id: number;
  product_id: number;
  ideal_min_temperature: number;
  ideal_max_temperature: number;
  conditional_min_temperature: number | null;
  conditional_max_temperature: number | null;
  rejection_min_temperature: number | null;
  rejection_max_temperature: number | null;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface CreateProductTemperatureConfiguration {
  product_id: number;
  ideal_min_temperature: number;
  ideal_max_temperature: number;
  conditional_min_temperature: number | null;
  conditional_max_temperature: number | null;
  rejection_min_temperature: number | null;
  rejection_max_temperature: number | null;
}

export interface UpdateProductTemperatureConfiguration {
  ideal_min_temperature: number;
  ideal_max_temperature: number;
  conditional_min_temperature: number | null;
  conditional_max_temperature: number | null;
  rejection_min_temperature: number | null;
  rejection_max_temperature: number | null;
}