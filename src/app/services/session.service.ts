import { environment } from '../../environments/environment';
import { LoginResult } from '../models/login-result.model';
import { MenuOption } from '../models/menu-option.model';
import { AuthUser } from '../models/auth-user.model';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})

export class SessionService {

  private readonly sessionKey = 'sitraCalco.session';
  private readonly activityKey = 'sitraCalco.lastActivity';
  private readonly idleTimeout = environment.sessionIdleTimeoutMinutes * 60 * 1000;

  saveSession(session: LoginResult): void {
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    this.registerLocalActivity();
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

  registerLocalActivity(): void {
    if (!this.getSession()) {
      return;
    }

    localStorage.setItem(this.activityKey, Date.now().toString());
  }

  getLastActivity(): number {
    return Number(localStorage.getItem(this.activityKey) ?? 0);
  }

  updateSessionExpiration(sessionExpiresAt: string): void {
    const session = this.getSession();

    if (!session) {
      return;
    }

    this.updateSession({
      ...session,
      sessionExpiresAt
    });
  }

  private updateSession(session: LoginResult): void {
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  isIdleExpired(): boolean {
    const lastActivity = this.getLastActivity();
    return lastActivity <= 0 || Date.now() - lastActivity >= this.idleTimeout;
  }

  isAuthenticated(): boolean {
    const session = this.getSession();

    if (!session?.accessToken) {
      return false;
    }

    const expiresAt = new Date(session.expiresAt).getTime();
    const sessionExpiresAt = new Date(session.sessionExpiresAt).getTime();

    if (!Number.isFinite(expiresAt) || !Number.isFinite(sessionExpiresAt) || expiresAt <= Date.now() || sessionExpiresAt <= Date.now() || this.isIdleExpired()) {
      this.clearSession();
      return false;
    }

    return true;
  }

  clearSession(): void {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.activityKey);
  }
}