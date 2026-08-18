import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../../services/session.service';
import { MenuOption } from '../../../models/menu-option.model';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule
  ],
  templateUrl: './sidebar.html',
})

export class Sidebar {

  @Input()
  sidebarOpen = true;

  @Output()
  toggleSidebar = new EventEmitter<void>();

  private readonly sessionService = inject(SessionService);
  readonly user = this.sessionService.getUser();
  private readonly router = inject(Router);
  expandedMenuId: number | null = null;
  hoveredMenuId: number | null = null;
  toggleHovered = false;

  readonly menuOptions =
    this.sessionService
      .getMenuOptions()
      .filter(
        item =>
          item.statusMenuOption === 1
      )
      .sort(
        (a, b) =>
          a.orderMenuOption -
          b.orderMenuOption
      );

  get rootMenuOptions(): MenuOption[] {
    return this.menuOptions.filter(item => item.parentMenuOption === null);
  }

  getChildren(parentId: number): MenuOption[] {
    return this.menuOptions.filter(item => item.parentMenuOption === parentId);
  }

  hasChildren(item: MenuOption): boolean {
    return this.getChildren(item.idMenuOption).length > 0;
  }

  toggleMenu(item: MenuOption): void {

    if (!this.sidebarOpen) {
      this.toggleSidebar.emit();
    }

    this.expandedMenuId =
      this.expandedMenuId === item.idMenuOption
        ? null
        : item.idMenuOption;
  }

  isExpanded(item: MenuOption): boolean {
    return this.expandedMenuId === item.idMenuOption;
  }

  isMenuActive(item: MenuOption): boolean {
    const paths = [
      item.pathMenuOption,
      ...this
        .getChildren(item.idMenuOption)
        .map(child => child.pathMenuOption)
    ].filter((path): path is string => !!path);

    return paths.some(
      path =>
        this.router.url === path ||
        this.router.url.startsWith(`${path}/`)
    );
  }

  getMenuIcon(name: string): string {
    const value = name.toLowerCase();

    if (value.includes('config')) {
      return 'settings';
    }

    if (value.includes('usuario')) {
      return 'people_outline';
    }

    if (value.includes('rol')) {
      return 'admin_panel_settings';
    }

    return 'dashboard_customize';
  }

  get displayName(): string {
    return this.user?.userName ?? 'Usuario';
  }

  get roleName(): string {
    return this.user?.nameRole ?? 'Sin rol';
  }

  get avatarLetter(): string {
    return this.displayName.trim().charAt(0).toUpperCase() || 'U';
  }
}