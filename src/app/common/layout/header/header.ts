import { SessionService } from '../../../services/session.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './header.html',
})

export class Header {
  
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  logout(): void {
    this.sessionService.clearSession();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}