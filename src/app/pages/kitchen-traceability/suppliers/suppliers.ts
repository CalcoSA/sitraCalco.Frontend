import { ResponseModalService } from '../../../services/response-modal.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupplierService } from '../../../services/supplier.service';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { Supplier } from '../../../models/supplier.model';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './suppliers.html',
})

export class Suppliers implements OnInit {

  private readonly responseModalService = inject(ResponseModalService);
  private readonly supplierService = inject(SupplierService);
  readonly suppliers = signal<Supplier[]>([]);
  readonly loading = signal(false);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly take = signal(10);
  readonly page = signal(1);

  readonly displayedColumns: string[] = [
    'supplier_code',
    'name',
    'actions',
  ];

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(page = this.page(), take = this.take()): void {
    this.loading.set(true);
    this.supplierService
      .getAll(page, take)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.suppliers.set([]);
            this.total.set(0);
            this.pages.set(0);
            this.responseModalService.show('error', 'Error al cargar proveedores', response.message || 'No fue posible consultar los proveedores.');
            return;
          }

          this.suppliers.set(response.result.items ?? []);
          this.total.set(response.result.totalRecords ?? 0);
          this.pages.set(response.result.totalPages ?? 0);
          this.page.set(response.result.pageNumber);
          this.take.set(response.result.pageSize);
        },

        error: (error) => {
          this.suppliers.set([]);
          this.total.set(0);
          this.pages.set(0);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los proveedores.';

          this.responseModalService.show('error', 'Error al cargar proveedores', message);
        },
      });
  }

  changePageSize(take: number): void {
    this.take.set(take);
    this.page.set(1);
    this.loadSuppliers(1, take);
  }

  previousPage(): void {

    if (this.page() <= 1) {
      return;
    }

    const previousPage = this.page() - 1;

    this.page.set(previousPage);
    this.loadSuppliers(previousPage, this.take());
  }

  nextPage(): void {
    
    if (this.page() >= this.pages()) {
      return;
    }

    const nextPage = this.page() + 1;

    this.page.set(nextPage);
    this.loadSuppliers(nextPage, this.take());
  }

  get firstItem(): number {

    if (this.total() === 0) {
      return 0;
    }

    return ((this.page() - 1) * this.take()) + 1;
  }

  get lastItem(): number {
    return Math.min(this.page() * this.take(), this.total());
  }
}