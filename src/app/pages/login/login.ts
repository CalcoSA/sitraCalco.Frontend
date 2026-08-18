import { ResponseModalService } from '../../services/response-modal.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SessionService } from '../../services/session.service';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './login.html',
})

export class LoginPage {

  private readonly responseModalService = inject(ResponseModalService);
  private readonly sessionService = inject(SessionService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  validationError = '';
  loading = false;

  readonly loginForm = this.formBuilder.nonNullable.group({
      username: [''],
      password: [''],
    });

  handleLogin(): void {
    this.validationError = '';

    const username = this.loginForm.controls.username.value.trim();
    const password = this.loginForm.controls.password.value;

    if (!username) {
      this.validationError = 'El usuario es obligatorio.';
      return;
    }

    if (!password) {
      this.validationError = 'La contraseña es obligatoria.';
      return;
    }

    this.loading = true;
    this.loginForm.disable();

    this.authService
      .login({
        username,
        password
      })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.loginForm.enable();
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('error', 'Error al iniciar sesión', response.message || 'No fue posible iniciar sesión.');
            return;
          }

          this.sessionService.saveSession(response.result);
          this.router.navigateByUrl('/', { replaceUrl: true });
        },
        error: (error) => {
          const message = error.error?.message || 'Ocurrió un error inesperado.';

          if (error.status === 401 && (message === 'Usuario o contraseña incorrectos.' || message === 'El usuario está inactivo en el aplicativo.')) {
            this.validationError = message;
            return;
          }

          const modalMessage = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : message;

          this.responseModalService.show('error', 'Error al iniciar sesión', modalMessage);
        },
      });
  }
}