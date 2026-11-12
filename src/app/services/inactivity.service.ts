import { Injectable, inject, NgZone } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SessionService } from './session.service';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})

export class InactivityService {

  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  private readonly reportInterval = 30_000;

  private started = false;
  private reporting = false;
  private pendingActivity = false;
  private lastReportAt = Date.now();
  private nextAllowedReportAt = 0;

  private readonly onUserActivity = (): void => {
    if (!this.sessionService.getSession()) {
      return;
    }

    if (!this.sessionService.isAuthenticated()) {
      this.closeLocalSession();
      return;
    }

    this.sessionService.registerLocalActivity();
    this.pendingActivity = true;
  };

  start(): void {

    if (this.started) {
      return;
    }

    this.started = true;
    this.zone.runOutsideAngular(() => {

      const events = [
        'pointerdown',
        'keydown',
        'scroll',
        'touchstart'
      ];

      events.forEach(eventName => {
        window.addEventListener(
          eventName,
          this.onUserActivity,
          { capture: true, passive: true }
        );
      });

      setInterval(() => this.checkSession(), 1000);
    });
  }

  private checkSession(): void {
    const session = this.sessionService.getSession();

    if (!session) {
      this.pendingActivity = false;
      return;
    }

    if (!this.sessionService.isAuthenticated()) {
      this.closeLocalSession();
      return;
    }

    if (!this.pendingActivity || this.reporting) {
      return;
    }

    const now = Date.now();
    const expiresAt = new Date(session.sessionExpiresAt).getTime();
    const intervalReached = now - this.lastReportAt >= this.reportInterval;
    const expiresSoon = expiresAt - now <= 20_000;

    if ((intervalReached || expiresSoon) && now >= this.nextAllowedReportAt) {
      this.reportActivity();
    }
  }

  private reportActivity(): void {
    this.reporting = true;
    this.pendingActivity = false;
    this.lastReportAt = Date.now();

    this.authService.registerActivity().subscribe({
      next: response => {
        this.reporting = false;

        if (response.isSuccess && response.result?.sessionExpiresAt) {
          this.sessionService.updateSessionExpiration(response.result.sessionExpiresAt);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.reporting = false;

        const code = error.error?.result?.code;

        if (error.status === 401 && (code === 'SESSION_EXPIRED' || code === 'SESSION_REVOKED' || code === 'SESSION_REQUIRED')) {
          this.closeLocalSession();
          return;
        }

        if (error.status === 429) {
          const retryAfter = Number(error.headers.get('Retry-After') ?? error.error?.result?.retryAfterSeconds);
          this.nextAllowedReportAt = Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 15_000);
        }

        this.pendingActivity = true;
      }
    });
  }

  logout(): void {

    if (!this.sessionService.getAccessToken()) {
      this.closeLocalSession();
      return;
    }

    this.authService.logout().subscribe({
      next: () => {},
      error: () => {}
    });

    this.closeLocalSession();
  }

  private closeLocalSession(): void {
    this.pendingActivity = false;

    this.zone.run(() => {
      this.sessionService.clearSession();

      if (!this.router.url.startsWith('/login')) {
        void this.router.navigateByUrl('/login', {
          replaceUrl: true
        });
      }
    });
  }
}