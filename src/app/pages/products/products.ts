import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ResponseModalService } from '../../services/response-modal.service';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ProductService } from '../../services/product.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Product } from '../../models/product.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatButtonModule,
    MatTableModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './products.html',
})

export class Products implements OnInit {

  private readonly responseModalService = inject(ResponseModalService);
  private readonly productService = inject(ProductService);
  private readonly formBuilder = inject(FormBuilder);
  readonly products = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly syncing = signal(false);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly take = signal(10);
  readonly page = signal(1);

  readonly displayedColumns: string[] = [
    'product_name',
    'reference',
    'unit_of_measure',
    'plan_id',
    'image_path',
    'actions',
  ];

  readonly searchControl = this.formBuilder.nonNullable.control('');

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(page = this.page(), take = this.take(), search = this.searchControl.value.trim()): void {
    this.loading.set(true);
    this.productService
      .getAll(page, take, search)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.products.set([]);
            this.total.set(0);
            this.pages.set(0);
            this.responseModalService.show('error', 'Error al cargar productos', response.message || 'No fue posible consultar los productos.');
            return;
          }

          this.products.set(response.result.items ?? []);
          this.total.set(response.result.total ?? 0);
          this.pages.set(response.result.pages ?? 0);
          this.page.set(response.result.page);
          this.take.set(response.result.take);
        },

        error: (error) => {
          this.products.set([]);
          this.total.set(0);
          this.pages.set(0);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los productos.';

          this.responseModalService.show('error', 'Error al cargar productos', message);
        },
      });
  }

  searchProducts(): void {
    this.page.set(1);
    this.loadProducts(1, this.take(), this.searchControl.value.trim());
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.page.set(1);
    this.loadProducts(1, this.take(), '');
  }

  changePageSize(take: number): void {
    this.take.set(take);
    this.page.set(1);
    this.loadProducts(1, take, this.searchControl.value.trim());
  }

  previousPage(): void {
    if (this.page() <= 1) {
      return;
    }

    const previousPage = this.page() - 1;

    this.page.set(previousPage);
    this.loadProducts(previousPage, this.take(), this.searchControl.value.trim());
  }

  nextPage(): void {
    if (this.page() >= this.pages()) {
      return;
    }

    const nextPage = this.page() + 1;

    this.page.set(nextPage);
    this.loadProducts(nextPage, this.take(), this.searchControl.value.trim());
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

  syncProducts(): void {

    if (this.syncing()) {
      return;
    }

    this.syncing.set(true);
    const loadingModal = this.responseModalService.showLoading('Actualizando productos', 'Se están sincronizando los productos. Este proceso puede tardar unos momentos.');

    this.productService.syncProducts()
      .pipe(
        finalize(() => {
          this.syncing.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          loadingModal.close();

          if (!response.isSuccess) {
            this.responseModalService.show('warning', 'No se actualizaron productos', response.message || 'No se encontraron productos válidos para sincronizar.');
            return;
          }

          const processed = response.result?.processed ?? 0;

          this.loadProducts(this.page(), this.take(), this.searchControl.value.trim());
          this.responseModalService.show('success', 'Productos actualizados', `${response.message || 'Productos sincronizados correctamente.'} Se procesaron ${processed} productos.`);
        },

        error: (error) => {
          loadingModal.close();

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al sincronizar los productos desde SIESA.';

          this.responseModalService.show('error', 'Error al actualizar productos', message);
        },
      });
  }
}