import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { Component } from '@angular/core';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    Sidebar,
    Header,
    Footer
  ],
  templateUrl: './app-layout.html',
})

export class AppLayout {

  sidebarOpen = true;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
