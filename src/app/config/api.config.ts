import { environment } from '../../environments/environment';

export const apiConfig = {
  authBaseUrl: environment.authApiUrl,
  loansBaseUrl: environment.loansApiUrl,
  integrationBaseUrl: environment.integrationApiUrl,
} as const;