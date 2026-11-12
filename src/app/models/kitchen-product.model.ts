import { ProductTemperatureConfiguration } from './product-temperature-configuration.model';
import { ProductReceptionConfiguration } from './product-reception-configuration.model';

export interface KitchenProduct {
  product_id: number;
  product_name: string;
  product_reference: string;
  unit_of_measure: string;
  product_reception_configuration: ProductReceptionConfiguration | null;
  product_temperature_configuration: ProductTemperatureConfiguration | null;
}

export interface KitchenProductSyncResult {
  newProductsSaved: boolean;
  newProductsCount: number;
}