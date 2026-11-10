import { Component, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ResponseModalService } from '../../services/response-modal.service';
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
    MatDialogModule,
  ],
  templateUrl: './products.html',
})

export class Products implements OnInit {

  @ViewChild('updateProductModal')
  private updateProductModal!: TemplateRef<void>;

  private readonly responseModalService = inject(ResponseModalService);
  private readonly productService = inject(ProductService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  
  readonly selectedProduct = signal<Product | null>(null);
  readonly selectedImageFile = signal<File | null>(null);
  readonly imagePreviewUrl = signal<string | null>(null);
  readonly products = signal<Product[]>([]);

  readonly updatingImage = signal(false);
  readonly deletingImage = signal(false);
  readonly loading = signal(false);
  readonly syncing = signal(false);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly take = signal(10);
  readonly page = signal(1);  

  private updateProductDialogRef?: MatDialogRef<any>;

  imageValidationError = '';

  readonly displayedColumns: string[] = [
    'product_name',
    'reference',
    'unit_of_measure',
    'factor',
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
          const created = response.result?.created ?? 0;
          const updated = response.result?.updated ?? 0;
          const unchanged = response.result?.unchanged ?? 0;

          this.loadProducts(this.page(), this.take(), this.searchControl.value.trim());
          this.responseModalService.show(
            'success',
            'Sincronización completada',
            `${response.message || 'Productos sincronizados correctamente.'} ` +
            `Procesados: ${processed}. ` +
            `Creados: ${created}. ` +
            `Actualizados: ${updated}. ` +
            `Sin cambios: ${unchanged}.`
          );
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

  openUpdateProductModal(product: Product): void {
    this.clearImagePreview();
    this.selectedProduct.set(product);
    this.selectedImageFile.set(null);
    this.imageValidationError = '';
    this.updateProductDialogRef =
      this.dialog.open(
        this.updateProductModal,
        {
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          disableClose: true,
        }
      );
  }

  get currentProductImage(): string | null {
    return this.imagePreviewUrl() ?? this.selectedProduct()?.imageUrl ?? null;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.imageValidationError = '';

    if (!file) {
      return;
    }

    this.clearImagePreview();
    this.selectedImageFile.set(file);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
  }

  updateProductImage(): void {
    this.imageValidationError = '';
    const product = this.selectedProduct();
    const file = this.selectedImageFile();

    if (!product) {
      this.responseModalService.show('error', 'Error', 'No hay un producto seleccionado.');
      return;
    }

    if (!file) {
      this.imageValidationError = 'Debes seleccionar una imagen para actualizar el producto.';
      return;
    }

    this.updatingImage.set(true);
    this.productService
      .updateImage(product.product_id, file)
      .pipe(
        finalize(() => {
          this.updatingImage.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo actualizar', response.message || 'No fue posible actualizar la imagen del producto.');
            return;
          }

          this.updateProductDialogRef?.close();
          this.clearImagePreview();
          this.selectedImageFile.set(null);
          this.selectedProduct.set(null);
          this.imageValidationError = '';
          this.loadProducts(this.page(), this.take(), this.searchControl.value.trim());
          this.responseModalService.show('success', 'Imagen actualizada', response.message || 'Imagen del producto actualizada correctamente.');
        },

        error: (error) => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al actualizar la imagen del producto.';

          this.responseModalService.show('error', 'Error al actualizar imagen', message);
        },
      });
  }

  closeUpdateProductModal(): void {

    if (this.updatingImage() || this.deletingImage()) {
      return;
    }

    this.updateProductDialogRef?.close();
    this.clearImagePreview();
    this.selectedImageFile.set(null);
    this.selectedProduct.set(null);
    this.imageValidationError = '';
  }

  private clearImagePreview(): void {
    const previewUrl = this.imagePreviewUrl();

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      this.imagePreviewUrl.set(null);
    }
  }

  deleteProductImage(): void {
    const product = this.selectedProduct();

    if (!product) {
      this.responseModalService.show('error', 'Error', 'No hay un producto seleccionado.');
      return;
    }

    if (!product.imageUrl && !product.image_path) {
      this.responseModalService.show('warning', 'Producto sin imagen', 'El producto no tiene una imagen para eliminar.');
      return;
    }

    this.deletingImage.set(true);
    this.productService
      .deleteImage(product.product_id)
      .pipe(
        finalize(() => {
          this.deletingImage.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo eliminar', response.message || 'No fue posible eliminar la imagen del producto.');
            return;
          }

          this.clearImagePreview();
          this.selectedImageFile.set(null);
          this.imageValidationError = '';

          this.selectedProduct.update(current => {

            if (!current) {
              return null;
            }

            return {
              ...current,
              image_path: null,
              imageUrl: null,
            };
          });

          this.loadProducts(this.page(), this.take(), this.searchControl.value.trim());
          this.responseModalService.show('success', 'Imagen eliminada', response.message || 'Imagen del producto eliminada correctamente.');
        },

        error: (error) => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al eliminar la imagen del producto.';

          this.responseModalService.show('error', 'Error al eliminar imagen', message);
        },
      });
  }
}