import { ProductTemperatureConfigurationService } from '../../../services/product-temperature-configuration.service';
import { ProductReceptionConfigurationService } from '../../../services/product-reception-configuration.service';
import { Component, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { KitchenProductService } from '../../../services/kitchen-product.service';
import { ResponseModalService } from '../../../services/response-modal.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { KitchenProduct } from '../../../models/kitchen-product.model';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { finalize, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatSlideToggleModule,
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

  readonly activeConfigurationTab = signal<'general' | 'shelfLife' | 'temperature' | 'inspection'>('general');
  
  readonly displayedColumns: string[] = [
    'product_reference',
    'product_name',
    'unit_of_measure',
    'actions',
  ];

  readonly receptionForm = this.formBuilder.group({
    minimum_shelf_life_days: this.formBuilder.control<number | null>(null),
    requires_guide: this.formBuilder.nonNullable.control(false),
    requires_shelf_life: this.formBuilder.nonNullable.control(false),
    requires_temperature: this.formBuilder.nonNullable.control(false),
    requires_visual_inspection: this.formBuilder.nonNullable.control(false),
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
    this.activeConfigurationTab.set('general');
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

  private receptionHasChanges(): boolean {
    const current = this.currentReceptionConfiguration();
    if (!current) return true;

    const value = this.receptionForm.getRawValue();
    const days = value.requires_shelf_life ? value.minimum_shelf_life_days : null;

    return (current.requires_guide !== value.requires_guide ||
      current.requires_shelf_life !== value.requires_shelf_life ||
      current.requires_temperature !== value.requires_temperature ||
      current.requires_visual_inspection !== value.requires_visual_inspection ||
      current.minimum_shelf_life_days !== days
    );
  }

  private temperatureHasChanges(): boolean {
    const current = this.currentTemperatureConfiguration();
    if (!current) return true;

    const value = this.temperatureForm.getRawValue();

    return (current.ideal_min_temperature !== value.ideal_min_temperature ||
      current.ideal_max_temperature !== value.ideal_max_temperature ||
      current.conditional_min_temperature !== value.conditional_min_temperature ||
      current.conditional_max_temperature !== value.conditional_max_temperature ||
      current.rejection_min_temperature !== value.rejection_min_temperature ||
      current.rejection_max_temperature !== value.rejection_max_temperature
    );
  }

  private async requireSuccess(request: import('rxjs').Observable<{ isSuccess: boolean; result?: boolean | null; message?: string | null; }>, fallback: string): Promise<void> {
    const response = await firstValueFrom(request);

    if (!response.isSuccess || response.result !== true) {
      throw new Error(response.message || fallback);
    }
  }

  private configurationError(error: unknown): string {
    const apiError = error as {
      message?: string;
      error?: { message?: string };
    };

    return apiError.error?.message || apiError.message || 'Ocurrió un error al procesar la configuración.';
  }
  
  createReceptionConfiguration(): void {
    const product = this.selectedProduct();

    if (!product || this.savingReception()) {
      return;
    }

    const value = this.receptionForm.getRawValue();

    if (value.requires_shelf_life && (value.minimum_shelf_life_days === null || value.minimum_shelf_life_days < 0)) {
      this.responseModalService.show('warning', 'Campo requerido', 'Debes ingresar una vida útil mínima válida.');
      this.activeConfigurationTab.set('shelfLife');
      return;
    }

    this.savingReception.set(true);

    this.receptionConfigurationService
      .create({
        product_id: product.product_id,
        minimum_shelf_life_days: value.requires_shelf_life ? value.minimum_shelf_life_days : null,
        requires_guide: value.requires_guide,
        requires_shelf_life: value.requires_shelf_life,
        requires_temperature: value.requires_temperature,
        requires_visual_inspection: value.requires_visual_inspection,
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

          this.responseModalService.show('success', 'Configuración de recepción', response.message || 'Configuración creada correctamente.');

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

    this.activeConfigurationTab.set('general');

    const reception = product.product_reception_configuration;

    this.receptionForm.patchValue({
      minimum_shelf_life_days: reception?.minimum_shelf_life_days ?? null,
      requires_guide: reception?.requires_guide ?? false,
      requires_shelf_life: reception?.requires_shelf_life ?? false,
      requires_temperature: reception?.requires_temperature ?? false,
      requires_visual_inspection: reception?.requires_visual_inspection ?? false,
    });

    this.temperatureForm.patchValue({
      ideal_min_temperature: product.product_temperature_configuration?.ideal_min_temperature ?? null,
      ideal_max_temperature: product.product_temperature_configuration?.ideal_max_temperature ?? null,
      conditional_min_temperature: product.product_temperature_configuration?.conditional_min_temperature ?? null,
      conditional_max_temperature: product.product_temperature_configuration?.conditional_max_temperature ?? null,
      rejection_min_temperature: product.product_temperature_configuration?.rejection_min_temperature ?? null,
      rejection_max_temperature: product.product_temperature_configuration?.rejection_max_temperature ?? null,
    });

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

  async saveReceptionConfiguration(): Promise<void> {
    const product = this.selectedProduct();

    if (!product || this.savingReception() || this.savingTemperature()) {
      return;
    }

    const reception = this.receptionForm.getRawValue();
    const temperature = this.temperatureForm.getRawValue();
    const currentReception = this.currentReceptionConfiguration();
    const currentTemperature = this.currentTemperatureConfiguration();

    this.receptionValidationError.set('');
    this.temperatureValidationError.set('');

    if (reception.requires_shelf_life && ( reception.minimum_shelf_life_days === null || !Number.isFinite(reception.minimum_shelf_life_days) || reception.minimum_shelf_life_days < 0 )) {
      this.receptionValidationError.set('Debes ingresar una vida útil mínima válida.');
      this.activeConfigurationTab.set('shelfLife');
      return;
    }

    const receptionData = {
      requires_guide: reception.requires_guide,
      requires_shelf_life: reception.requires_shelf_life,
      requires_temperature: reception.requires_temperature,
      requires_visual_inspection: reception.requires_visual_inspection,
      minimum_shelf_life_days: reception.requires_shelf_life ? reception.minimum_shelf_life_days : null
    };

    const temperatureData = {
      ideal_min_temperature: temperature.ideal_min_temperature!,
      ideal_max_temperature: temperature.ideal_max_temperature!,
      conditional_min_temperature: temperature.conditional_min_temperature,
      conditional_max_temperature: temperature.conditional_max_temperature,
      rejection_min_temperature: temperature.rejection_min_temperature,
      rejection_max_temperature: temperature.rejection_max_temperature
    };

    const receptionChanged = this.receptionHasChanges();
    const temperatureChanged = reception.requires_temperature && this.temperatureHasChanges();

    if (temperatureChanged) {
      const min = temperature.ideal_min_temperature;
      const max = temperature.ideal_max_temperature;

      if (min === null || max === null || !Number.isFinite(min) || !Number.isFinite(max) || min > max) {
        this.temperatureValidationError.set('Verifica las temperaturas ideales mínima y máxima.');
        this.activeConfigurationTab.set('temperature');
        return;
      }

      const ranges = [
        [temperature.conditional_min_temperature,
        temperature.conditional_max_temperature],
        [temperature.rejection_min_temperature,
        temperature.rejection_max_temperature]
      ];

      if (ranges.some(([rangeMin, rangeMax]) =>
        (rangeMin !== null && !Number.isFinite(rangeMin)) ||
        (rangeMax !== null && !Number.isFinite(rangeMax)) ||
        (rangeMin !== null && rangeMax !== null && rangeMin > rangeMax)
      )) {
        this.temperatureValidationError.set('Verifica los rangos condicional y de rechazo.');
        this.activeConfigurationTab.set('temperature');
        return;
      }
    }

    if (!receptionChanged && !temperatureChanged && !(currentTemperature && !reception.requires_temperature)) {
      this.responseModalService.show('info', 'Sin cambios', 'No hay cambios pendientes por guardar.');
      return;
    }

    this.savingReception.set(true);
    let changesSaved = false;

    try {
      if (!reception.requires_temperature && currentTemperature) {
        await this.requireSuccess(this.temperatureConfigurationService.delete(currentTemperature.temperature_configuration_id), 'No fue posible eliminar la temperatura.');
        changesSaved = true;
      }

      if (receptionChanged) {
        if (currentReception) {
          await this.requireSuccess(this.receptionConfigurationService.update(currentReception.product_configuration_id, receptionData), 'No fue posible actualizar la recepción.');
        } else {
          await this.requireSuccess(
            this.receptionConfigurationService.create({
              product_id: product.product_id, ...receptionData
            }), 'No fue posible crear la recepción.');
        }

        changesSaved = true;
      }

      if (reception.requires_temperature && temperatureChanged) {
        if (currentTemperature) {
          await this.requireSuccess(this.temperatureConfigurationService.update(currentTemperature.temperature_configuration_id, temperatureData), 'No fue posible actualizar la temperatura.');
        } else {
          await this.requireSuccess(
            this.temperatureConfigurationService.create({
              product_id: product.product_id,
              ...temperatureData
            }), 'No fue posible crear la temperatura.');
        }

        changesSaved = true;
      }

      this.closeConfigurationAndReload();

      this.responseModalService.show('success', 'Configuración guardada', 'Los cambios del producto se guardaron correctamente.');

    } catch (error: unknown) {
      const message = this.configurationError(error);

      if (changesSaved) {
        this.closeConfigurationAndReload();
        this.responseModalService.show('warning', 'Guardado parcial', `${message} Algunos cambios se guardaron. Abre nuevamente el producto para verificar su configuración.`);
      } else {
        this.responseModalService.show('error', 'Error de configuración', message);
      }
    } finally {
      this.savingReception.set(false);
    }
  }

  async saveTemperatureConfiguration(): Promise<void> {
    const product = this.selectedProduct();
    const reception = this.currentReceptionConfiguration();

    if (!product || this.savingTemperature() || this.savingReception()) {
      return;
    }

    if (!reception || !reception.requires_temperature) {
      this.responseModalService.show('warning', 'Configuración requerida', 'Primero debes guardar la recepción con el control de temperatura activado.');
      return;
    }

    const value = this.temperatureForm.getRawValue();

    if (value.ideal_min_temperature === null ||
      value.ideal_max_temperature === null ||
      !Number.isFinite(value.ideal_min_temperature) ||
      !Number.isFinite(value.ideal_max_temperature) ||
      value.ideal_min_temperature > value.ideal_max_temperature
    ) {
      this.temperatureValidationError.set('Verifica las temperaturas ideales mínima y máxima.');
      return;
    }

    const data = {
      ideal_min_temperature: value.ideal_min_temperature,
      ideal_max_temperature: value.ideal_max_temperature,
      conditional_min_temperature: value.conditional_min_temperature,
      conditional_max_temperature: value.conditional_max_temperature,
      rejection_min_temperature: value.rejection_min_temperature,
      rejection_max_temperature: value.rejection_max_temperature
    };

    const current = this.currentTemperatureConfiguration();
    this.savingTemperature.set(true);

    try {
      if (current) {
        await this.requireSuccess(
          this.temperatureConfigurationService.update(current.temperature_configuration_id, data), 'No fue posible actualizar los rangos.');
      } else {
        await this.requireSuccess(
          this.temperatureConfigurationService.create({
            product_id: product.product_id,
            ...data
          }), 'No fue posible crear los rangos.'
        );
      }

      this.closeConfigurationAndReload();
      this.responseModalService.show('success', 'Temperatura guardada', 'Los rangos de temperatura se guardaron correctamente.');
    } catch (error: unknown) {
      this.responseModalService.show('error', 'Error de temperatura', this.configurationError(error));
    } finally {
      this.savingTemperature.set(false);
    }
  }

  async deleteReceptionConfiguration(): Promise<void> {
    const reception = this.currentReceptionConfiguration();
    const temperature = this.currentTemperatureConfiguration();

    if (!reception || this.savingReception() || this.savingTemperature()) {
      return;
    }

    this.savingReception.set(true);
    let temperatureDeleted = false;

    try {
      if (temperature) {
        await this.requireSuccess(this.temperatureConfigurationService.delete(temperature.temperature_configuration_id), 'No fue posible eliminar la temperatura.');
        temperatureDeleted = true;
      }

      await this.requireSuccess(this.receptionConfigurationService.delete(reception.product_configuration_id), 'No fue posible eliminar la recepción.');

      this.closeConfigurationAndReload();
      this.responseModalService.show('success', 'Configuración eliminada', 'Se eliminó la configuración del producto.');

    } catch (error: unknown) {
      if (temperatureDeleted) {
        this.closeConfigurationAndReload();
      }

      this.responseModalService.show(temperatureDeleted ? 'warning' : 'error', 'Eliminar configuración', this.configurationError(error));
    } finally {
      this.savingReception.set(false);
    }
  }

  async deleteTemperatureConfiguration(): Promise<void> {
    const temperature = this.currentTemperatureConfiguration();
    const reception = this.currentReceptionConfiguration();

    if (!temperature || !reception || this.savingTemperature() || this.savingReception()) {
      return;
    }

    this.savingTemperature.set(true);
    let temperatureDeleted = false;

    try {
      await this.requireSuccess(this.temperatureConfigurationService.delete(temperature.temperature_configuration_id), 'No fue posible eliminar la temperatura.');

      temperatureDeleted = true;

      await this.requireSuccess(
        this.receptionConfigurationService.update(
          reception.product_configuration_id,
          {
            requires_guide: reception.requires_guide,
            requires_shelf_life: reception.requires_shelf_life,
            requires_temperature: false,
            requires_visual_inspection: reception.requires_visual_inspection,
            minimum_shelf_life_days: reception.requires_shelf_life ? reception.minimum_shelf_life_days : null
          }
        ),
        'Se eliminaron los rangos, pero no fue posible desactivar el control de temperatura.'
      );

      this.closeConfigurationAndReload();
      this.responseModalService.show('success', 'Temperatura eliminada', 'Se eliminaron los rangos y se desactivó el control de temperatura.');

    } catch (error: unknown) {
      if (temperatureDeleted) {
        this.closeConfigurationAndReload();
      }

      this.responseModalService.show(temperatureDeleted ? 'warning' : 'error', 'Eliminar temperatura', this.configurationError(error));
    } finally {
      this.savingTemperature.set(false);
    }
  }

  closeConfigurationAndReload(): void {
    this.activeDialogRef?.close();
    this.loadProducts(this.page(), this.take(), this.searchControl.value.trim());
  }
}