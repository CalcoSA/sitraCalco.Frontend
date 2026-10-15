import { InactivityService } from './services/inactivity.service';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})

export class App {
  protected readonly title = signal('sitraCalco-frontend');
  private readonly inactivityService = inject(InactivityService);

  constructor() {
    this.inactivityService.start();
  }
}