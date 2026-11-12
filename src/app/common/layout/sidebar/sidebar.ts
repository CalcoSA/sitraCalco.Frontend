import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../../services/session.service';
import { MenuOption } from '../../../models/menu-option.model';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLinkActive,
    NgTemplateOutlet,
    MatTooltipModule,
    MatButtonModule,
    MatIconModule,
    RouterLink
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
  //expandedMenuId: number | null = null;
  hoveredMenuId: number | null = null;
  expandedMenuIds = new Set<number>();
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
    return this.menuOptions
      .filter(
        item =>
          item.parentMenuOption === parentId
      )
      .sort(
        (a, b) =>
          a.orderMenuOption -
          b.orderMenuOption
      );
  }

  hasChildren(item: MenuOption): boolean {
    return this.getChildren(item.idMenuOption).length > 0;
  }

  toggleMenu(item: MenuOption): void {

    if (!this.sidebarOpen) {
      this.toggleSidebar.emit();
    }

    if (this.expandedMenuIds.has(item.idMenuOption)) {
      this.expandedMenuIds.delete(item.idMenuOption);
      return;
    }

    this.expandedMenuIds.add(item.idMenuOption);
  }

  isExpanded(item: MenuOption): boolean {
    return this.expandedMenuIds.has(item.idMenuOption);
  }

  private getDescendantPaths(item: MenuOption): string[] {
    const paths: string[] = [];

    if (item.pathMenuOption) {
      paths.push(item.pathMenuOption);
    }

    const children = this.getChildren(item.idMenuOption);

    for (const child of children) {
      paths.push(...this.getDescendantPaths(child));
    }

    return paths;
  }

  isMenuActive(item: MenuOption): boolean {
    const paths = this.getDescendantPaths(item);

    return paths.some(
      path =>
        this.router.url === path ||
        this.router.url.startsWith(`${path}/`)
    );
  }

  getMenuIcon(item: MenuOption): string {
    const value = item.nameMenuOption.toLowerCase();

    if (item.pathMenuOption === '/inventarios/inventarios') {
      return 'assignment';
    }

    if (value.includes('configuración inventarios')) {
      return 'display_settings';
    }

    if (value.includes('bodega')) {
      return 'warehouse';
    }

    if (value.includes('config')) {
      return 'settings';
    }

    if (value.includes('usuario')) {
      return 'people_outline';
    }

    if (value.includes('rol')) {
      return 'admin_panel_settings';
    }

    if (value.includes('conciliación')) {
      return 'pivot_table_chart';
    }

    if (value.includes('plano')) {
      return 'description';
    }

    if (value.includes('parámetros')) {
      return 'lock';
    }

    if (value.includes('log')) {
      return 'receipt_long';
    }

    if (value.includes('inventario')) {
      return 'inventory';
    }

    if (value.includes('proveedor')) {
      return 'local_shipping';
    }

    if (value.includes('producto')) {
      return 'cookie';
    }

    if (value.includes('formato')) {
      return 'description';
    }

    if (value.includes('materias primas')) {
      return 'shopping_cart';
    }

    if (value.includes('recepcion')) {
      return 'move_to_inbox';
    }

    if (value.includes('maestro')) {
      return 'widgets';
    }

    if (value.includes('cocina principal')) {
      return 'event_note';
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