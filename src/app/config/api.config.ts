import { environment } from '../../environments/environment';

export const apiConfig = {
  authBaseUrl: environment.authApiUrl,
  inventoryBaseUrl: environment.inventoryApiUrl,
  kitchenTraceabilityBaseUrl: environment.kitchenTraceabilityApiUrl,
} as const;