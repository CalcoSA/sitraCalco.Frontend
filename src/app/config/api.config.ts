import { environment } from '../../environments/environment';

export const apiConfig = {
  authBaseUrl: environment.authApiUrl,
  inventoryBaseUrl: environment.inventoryApiUrl,
  integrationBaseUrl: environment.integrationApiUrl,
} as const;