import { ProductTemperatureConfigurationService } from '../../../services/product-temperature-configuration.service';
import { ProductReceptionConfigurationService } from '../../../services/product-reception-configuration.service';
import { Component, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { KitchenProductService } from '../../../services/kitchen-product.service';
import { ResponseModalService } from '../../../services/response-modal.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { KitchenProduct } from '../../../models/kitchen-product.model';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './products.html',
})

export class Products implements OnInit {

  @ViewChild('configurationDialog')
  private configurationDialog!: TemplateRef<unknown>;

  readonly currentTemperatureConfiguration = signal(null as KitchenProduct['product_temperature_configuration']);
  readonly currentReceptionConfiguration = signal(null as KitchenProduct['product_reception_configuration']);
  private readonly temperatureConfigurationService = inject(ProductTemperatureConfigurationService);
  private readonly receptionConfigurationService = inject(ProductReceptionConfigurationService);
  private readonly responseModalService = inject(ResponseModalService);
  private readonly productService = inject(KitchenProductService);
  readonly selectedProduct = signal<KitchenProduct | null>(null);
  private activeDialogRef: MatDialogRef<unknown> | null = null;
  private readonly formBuilder = inject(FormBuilder);
  readonly products = signal<KitchenProduct[]>([]);
  readonly temperatureValidationError = signal('');
  readonly receptionValidationError = signal('');
  private readonly dialog = inject(MatDialog);
  readonly savingTemperature = signal(false);
  readonly savingReception = signal(false);
  readonly loading = signal(false);
  readonly syncing = signal(false);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly take = signal(10);
  readonly page = signal(1);
  
  readonly displayedColumns: string[] = [
    'product_reference',
    'product_name',
    'unit_of_measure',
    'actions',
  ];

  readonly receptionForm = this.formBuilder.group({
    minimum_shelf_life_days: this.formBuilder.control<number | null>(null),
  });

  readonly temperatureForm = this.formBuilder.group({
    ideal_min_temperature: this.formBuilder.control<number | null>(null),
    ideal_max_temperature: this.formBuilder.control<number | null>(null),
    conditional_min_temperature: this.formBuilder.control<number | null>(null),
    conditional_max_temperature: this.formBuilder.control<number | null>(null),
    rejection_min_temperature: this.formBuilder.control<number | null>(null),
    rejection_max_temperature: this.formBuilder.control<number | null>(null),
  });

  readonly searchControl = this.formBuilder.nonNullable.control('');

  ngOnInit(): void {
    this.loadProducts();
  }

  syncProducts(): void {

    if (this.syncing()) {
      return;
    }

    this.syncing.set(true);

    const loadingModal = this.responseModalService.showLoading('Actualizando productos', 'Se están consultando nuevos productos desde SIESA. Este proceso puede tardar unos momentos.');

    this.productService
      .syncProducts()
      .pipe(
        finalize(() => {
          this.syncing.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          loadingModal.close();

          if (!response.isSuccess) {
            this.responseModalService.show('warning', 'No se actualizaron productos', response.message || 'No fue posible actualizar los productos desde SIESA.');
            return;
          }

          const newProductsSaved = response.result?.newProductsSaved ?? false;
          const newProductsCount = response.result?.newProductsCount ?? 0;

          if (!newProductsSaved || newProductsCount === 0) {
            this.responseModalService.show('info', 'Productos actualizados', response.message || 'No se encontraron productos nuevos para registrar desde SIESA.');
            return;
          }

          this.loadProducts(this.page(), this.take(), this.searchControl.value.trim());
          this.responseModalService.show('success', 'Productos actualizados', `${response.message || 'Productos sincronizados correctamente.'} Se registraron ${newProductsCount} producto${newProductsCount === 1 ? '' : 's'} nuevo${newProductsCount === 1 ? '' : 's'}.`);
        },

        error: (error) => {
          loadingModal.close();

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al actualizar los productos desde SIESA.';

          this.responseModalService.show('error', 'Error al actualizar productos', message);
        },
      });
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
          this.total.set(response.result.totalRecords ?? 0);
          this.pages.set(response.result.totalPages ?? 0);
          this.page.set(response.result.pageNumber);
          this.take.set(response.result.pageSize);
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

  closeDialog(): void {
    this.activeDialogRef?.close();
  }

  openCreateConfiguration(product: KitchenProduct): void {
    this.selectedProduct.set(product);
    this.currentReceptionConfiguration.set(null);
    this.currentTemperatureConfiguration.set(null);
    this.receptionValidationError.set('');
    this.temperatureValidationError.set('');
    this.receptionForm.reset();
    this.temperatureForm.reset();

    this.activeDialogRef = this.dialog.open(
      this.configurationDialog,
      {
        width: '850px',
        maxWidth: '95vw',
        maxHeight: '95vh',
        autoFocus: false,
        disableClose: true,
      }
    );
  }

  createReceptionConfiguration(): void {
    const product = this.selectedProduct();

    if (!product || this.savingReception()) {
      return;
    }

    const minimumShelfLifeDays = this.receptionForm.value.minimum_shelf_life_days;

    if (minimumShelfLifeDays === null || minimumShelfLifeDays === undefined) {
      this.responseModalService.show('warning', 'Campo requerido', 'Debes ingresar la vida útil mínima en días.');
      return;
    }

    this.savingReception.set(true);
    this.receptionConfigurationService
      .create({
        product_id: product.product_id,
        minimum_shelf_life_days: minimumShelfLifeDays,
      })
      .pipe(
        finalize(() => {
          this.savingReception.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('warning', 'Configuración de recepción', response.message || 'No fue posible crear la configuración de recepción.');
            return;
          }

          this.responseModalService.show('success', 'Configuración de recepción', response.message);
          this.activeDialogRef?.close();

          this.activeDialogRef = this.dialog.open(
            this.configurationDialog,
            {
              width: '850px',
              maxWidth: '95vw',
              maxHeight: '95vh',
              autoFocus: false,
              disableClose: true,
            }
          );
        },

        error: (error) => {
          this.responseModalService.show('error', 'Error', error.error?.message || 'Ocurrió un error al crear la configuración de recepción.');
        },
      });
  }

  openUpdateConfiguration(product: KitchenProduct): void {
    this.receptionValidationError.set('');
    this.temperatureValidationError.set('');
    this.selectedProduct.set(product);
    this.currentReceptionConfiguration.set(product.product_reception_configuration);
    this.currentTemperatureConfiguration.set(product.product_temperature_configuration);

    this.receptionForm.patchValue({
      minimum_shelf_life_days: product.product_reception_configuration ?.minimum_shelf_life_days ?? null,
    });

    this.temperatureForm.patchValue({
      ideal_min_temperature: product.product_temperature_configuration ?.ideal_min_temperature ?? null,
      ideal_max_temperature: product.product_temperature_configuration ?.ideal_max_temperature ?? null,
      conditional_min_temperature: product.product_temperature_configuration ?.conditional_min_temperature ?? null,
      conditional_max_temperature: product.product_temperature_configuration ?.conditional_max_temperature ?? null,
      rejection_min_temperature: product.product_temperature_configuration ?.rejection_min_temperature ?? null,
      rejection_max_temperature: product.product_temperature_configuration ?.rejection_max_temperature ?? null,
    });

    this.activeDialogRef = this.dialog.open(
      this.configurationDialog,
      {
        width: '850px',
        maxWidth: '95vw',
        height: '720px',
        maxHeight: '90vh',
        autoFocus: false,
        disableClose: true,
      }
    );
  }

  saveReceptionConfiguration(): void {
    const product = this.selectedProduct();

    if (!product || this.savingReception()) {
      return;
    }

    const days = this.receptionForm.value.minimum_shelf_life_days;

    if (days === null || days === undefined) {
      this.receptionValidationError.set('Debes ingresar la vida útil mínima en días.');
      return;
    }

    this.receptionValidationError.set('');

    const current = this.currentReceptionConfiguration();

    this.savingReception.set(true);

    const request$ = current
      ? this.receptionConfigurationService.update(
          current.product_configuration_id,
          {
            minimum_shelf_life_days: days,
          }
        )
      : this.receptionConfigurationService.create({
          product_id: product.product_id,
          minimum_shelf_life_days: days,
        });

    request$
      .pipe(
        finalize(() => {
          this.savingReception.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('warning', 'Configuración de recepción', response.message || 'No fue posible guardar la configuración.');
            return;
          }

          this.currentReceptionConfiguration.set({
            product_configuration_id: 0,
            product_id: product.product_id,
            minimum_shelf_life_days: days,
            created_at: '',
            created_by: '',
            updated_at: null,
            updated_by: null,
          });

          this.loadProducts(this.page(), this.take(), this.searchControl.value.trim());
        },

        error: (error) => {
          this.responseModalService.show('error', 'Error', error.error?.message || 'Ocurrió un error al guardar la configuración.');
        },
      });
  }

  saveTemperatureConfiguration(): void {
    const product = this.selectedProduct();

    if (!product || this.savingTemperature()) {
      return;
    }

    const value = this.temperatureForm.getRawValue();

    if (value.ideal_min_temperature === null || value.ideal_max_temperature === null) {
      this.temperatureValidationError.set('Debes ingresar la temperatura ideal mínima y máxima.');
      return;
    }

    this.temperatureValidationError.set('');

    const current = this.currentTemperatureConfiguration();

    const data = {
      ideal_min_temperature: value.ideal_min_temperature,
      ideal_max_temperature: value.ideal_max_temperature,
      conditional_min_temperature: value.conditional_min_temperature,
      conditional_max_temperature: value.conditional_max_temperature,
      rejection_min_temperature: value.rejection_min_temperature,
      rejection_max_temperature: value.rejection_max_temperature,
    };

    this.savingTemperature.set(true);

    const request$ = current
      ? this.temperatureConfigurationService.update( current.temperature_configuration_id, data)
      : this.temperatureConfigurationService.create({
          product_id: product.product_id,
          ...data,
        });

    request$
      .pipe(
        finalize(() => {
          this.savingTemperature.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('warning', 'Configuración de temperatura', response.message || 'No fue posible guardar la configuración.');
            return;
          }

          this.activeDialogRef?.close();
          this.loadProducts(this.page(), this.take(), this.searchControl.value.trim());
          this.responseModalService.show('success', 'Configuración exitosa', 'La configuración del producto se guardó correctamente.');
          this.closeConfigurationAndReload();
        },

        error: (error) => {
          this.responseModalService.show('error', 'Error', error.error?.message || 'Ocurrió un error al guardar la configuración.');
        },
      });
  }

  deleteReceptionConfiguration(): void {
    const configuration = this.currentReceptionConfiguration();

    if (!configuration || this.savingReception()) {
      return;
    }

    this.savingReception.set(true);
    this.receptionConfigurationService
      .delete(configuration.product_configuration_id)
      .pipe(
        finalize(() => {
          this.savingReception.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('warning', 'Configuración de recepción', response.message || 'No fue posible eliminar la configuración.');
            return;
          }

          this.responseModalService.show('success', 'Configuración eliminada', response.message);
          this.closeConfigurationAndReload();
        },

        error: (error) => {
          this.responseModalService.show('error', 'Error', error.error?.message || 'Ocurrió un error al eliminar la configuración.');
        },
      });
  }

  deleteTemperatureConfiguration(): void {
    const configuration = this.currentTemperatureConfiguration();

    if (!configuration || this.savingTemperature()) {
      return;
    }

    this.savingTemperature.set(true);
    this.temperatureConfigurationService
      .delete(configuration.temperature_configuration_id)
      .pipe(
        finalize(() => {
          this.savingTemperature.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('warning', 'Configuración de temperatura', response.message || 'No fue posible eliminar la configuración.');
            return;
          }

          this.responseModalService.show('success', 'Configuración eliminada', response.message);
          this.closeConfigurationAndReload();
        },

        error: (error) => {
          this.responseModalService.show('error', 'Error', error.error?.message || 'Ocurrió un error al eliminar la configuración.');
        },
      });
  }

  closeConfigurationAndReload(): void {
    this.activeDialogRef?.close();
    this.loadProducts(this.page(), this.take(), this.searchControl.value.trim());
  }
}