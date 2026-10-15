import { InactivityService } from '../../../services/inactivity.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Component, inject } from '@angular/core';

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

  private readonly inactivityService = inject(InactivityService);

  logout(): void {
    this.inactivityService.logout();
  }
}