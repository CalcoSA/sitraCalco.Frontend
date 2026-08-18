import { LoginResult } from '../models/login-result.model';
import { MenuOption } from '../models/menu-option.model';
import { AuthUser } from '../models/auth-user.model';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})

export class SessionService {

  private readonly sessionKey = 'sitraCalco.session';

  saveSession(session: LoginResult): void {
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  getSession(): LoginResult | null {
    const session = localStorage.getItem(this.sessionKey);

    if (!session) {
      return null;
    }

    try {
      return JSON.parse(session) as LoginResult;
    } catch {
      this.clearSession();
      return null;
    }
  }

  getAccessToken(): string | null {
    return this.getSession()?.accessToken ?? null;
  }

  getUser(): AuthUser | null {
    return this.getSession()?.user ?? null;
  }

  getMenuOptions(): MenuOption[] {
    return this.getSession()?.menuOptions ?? [];
  }

  isAuthenticated(): boolean {

    const session = this.getSession();

    if (!session?.accessToken) {
      return false;
    }

    const expiresAt = new Date(session.expiresAt).getTime();

    if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      this.clearSession();
      return false;
    }

    return true;
  }

  clearSession(): void {
    localStorage.removeItem(this.sessionKey);
  }
}