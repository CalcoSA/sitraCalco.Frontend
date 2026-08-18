import { MenuOption } from './menu-option.model';
import { AuthUser } from './auth-user.model';

export interface LoginResult {
  tokenType: string;
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
  menuOptions: MenuOption[];
}
