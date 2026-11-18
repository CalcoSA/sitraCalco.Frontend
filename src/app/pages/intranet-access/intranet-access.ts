import { ResponseModalService } from '../../services/response-modal.service';
import { SessionService } from '../../services/session.service';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-intranet-access',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './intranet-access.html'
})

export class IntranetAccessPage implements OnInit {  
  
  private readonly responseModalService = inject(ResponseModalService);
  private readonly sessionService = inject(SessionService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = true;

  ngOnInit(): void {

    const fragment = window.location.hash.substring(1);
    const params = new URLSearchParams(fragment);

    const userLogin = params.get('userLogin') ?? '';
    const tsText = params.get('ts') ?? '';
    const sig = params.get('sig') ?? '';
    const ts = Number(tsText);

    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);

    this.sessionService.clearSession();

    if (!userLogin || !/^\d+$/.test(tsText) || !Number.isSafeInteger(ts) || !/^[a-fA-F0-9]{64}$/.test(sig)) {
      this.showError('El enlace de acceso desde la intranet no es válido.');
      return;
    }

    this.authService.intranetAccess(userLogin, ts, sig).subscribe({
      next: response => {
        if (!response.isSuccess || !response.result) {
          this.showError(response.message || 'No fue posible iniciar sesión.');
          return;
        }

        this.sessionService.saveSession(response.result);

        void this.router.navigateByUrl('/', { replaceUrl: true });
      },

      error: (error: HttpErrorResponse) => {
        const message = error.error?.message;

        this.showError(typeof message === 'string' && message ? message : 'No fue posible validar el acceso a SITRA CALCO.');
      }
    });
  }

  private showError(message: string): void {
    this.loading = false;
    this.responseModalService.show('error', 'Acceso denegado', message);
  }
}