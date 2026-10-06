import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats, MatNativeDateModule, NativeDateAdapter } from '@angular/material/core';
import { KitchenProductService } from '../../services/kitchen-product.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReceptionTypeService } from '../../services/reception-type.service';
import { ResponseModalService } from '../../services/response-modal.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { KitchenProduct } from '../../models/kitchen-product.model';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { SupplierService } from '../../services/supplier.service';
import { ReceptionType } from '../../models/reception-type.model';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { Supplier } from '../../models/supplier.model';
import { MatIconModule } from '@angular/material/icon';

const SITRA_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' },
  },
  display: {
    dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' },
    monthYearLabel: { month: 'long', year: 'numeric' },
    dateA11yLabel: { day: '2-digit', month: 'long', year: 'numeric' },
    monthYearA11yLabel: { month: 'long', year: 'numeric' },
  },
};

@Component({
  selector: 'app-receptions',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatButtonModule,
    MatInputModule,
    MatRadioModule,
    MatIconModule,    
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
    { provide: DateAdapter, useClass: NativeDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: SITRA_DATE_FORMATS }
  ],
  templateUrl: './receptions.html',
})

export class Receptions implements OnInit {

  private readonly receptionTypeService = inject(ReceptionTypeService);
  private readonly responseModalService = inject(ResponseModalService);
  private readonly productService = inject(KitchenProductService);
  private readonly supplierService = inject(SupplierService);  
  readonly receptionTypes = signal<ReceptionType[]>([]);  
  private readonly formBuilder = inject(FormBuilder);
  readonly products = signal<KitchenProduct[]>([]);  
  readonly loadingReceptionTypes = signal(false);  
  readonly suppliers = signal<Supplier[]>([]);
  readonly loadingSuppliers = signal(false);  
  readonly loadingProducts = signal(false);
  
  readonly receptionTypeControl = this.formBuilder.control<ReceptionType | string | null>(null);
  readonly productControl = this.formBuilder.control<KitchenProduct | string | null>(null);
  readonly transportConditionsControl = this.formBuilder.control<boolean | null>(null);
  readonly supplierControl = this.formBuilder.control<Supplier | string | null>(null);
  readonly expirationDateControl = this.formBuilder.control<Date | null>(null);
  readonly temperature1Control = this.formBuilder.control<number | null>(null);
  readonly temperature2Control = this.formBuilder.control<number | null>(null);
  readonly temperature3Control = this.formBuilder.control<number | null>(null);
  readonly lotUnitsControl = this.formBuilder.control<number | null>(null);
  readonly lotKgLtControl = this.formBuilder.control<number | null>(null);  
  readonly guideNumberControl = this.formBuilder.nonNullable.control('');
  readonly lotControl = this.formBuilder.nonNullable.control('');
  readonly visualInspectionNonCompliantUnitsControl = this.formBuilder.control<number | null>(null);
  readonly visualInspectionCompliantUnitsControl = this.formBuilder.control<number | null>(null);
  
  selectedReceptionType: ReceptionType | null = null;
  selectedProduct: KitchenProduct | null = null;
  selectedSupplier: Supplier | null = null;

  ngOnInit(): void {
    this.loadReceptionTypes();

    this.receptionTypeControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(value => {

        if (typeof value !== 'string') {
          return;
        }

        this.selectedReceptionType = null;
        this.loadReceptionTypes(value);
      });

    this.supplierControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(value => {

        if (typeof value !== 'string') {
          return;
        }

        this.selectedSupplier = null;
        this.loadSuppliers(value);
      });

    this.productControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(value => {

        if (typeof value !== 'string') {
          return;
        }

        this.selectedProduct = null;
        this.loadProducts(value);
      });
  }

  loadReceptionTypes(search = ''): void {
    this.loadingReceptionTypes.set(true);
    this.receptionTypeService
      .getOptions(search)
      .pipe(
        finalize(() => {
          this.loadingReceptionTypes.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess || !response.result) {
            this.receptionTypes.set([]);
            return;
          }

          this.receptionTypes.set(response.result);
        },

        error: error => {
          this.receptionTypes.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los tipos de recepción.';

          this.responseModalService.show('error', 'Error al cargar formatos', message);
        },
      });
  }

  displayReceptionType(receptionType: ReceptionType | string | null): string {

    if (!receptionType) {
      return '';
    }

    if (typeof receptionType === 'string') {
      return receptionType;
    }

    return receptionType.form_code
      ? `${receptionType.name} - ${receptionType.form_code}`
      : receptionType.name;
  }

  selectReceptionType(receptionType: ReceptionType): void {
    this.selectedReceptionType = receptionType;
    this.receptionTypeControl.setValue(receptionType, { emitEvent: false, });
    this.loadSuppliers();
    this.loadProducts();
  }

  loadSuppliers(search = ''): void {
    this.loadingSuppliers.set(true);
    this.supplierService
      .getOptions(search)
      .pipe(
        finalize(() => {
          this.loadingSuppliers.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess || !response.result) {
            this.suppliers.set([]);
            return;
          }

          this.suppliers.set(response.result);
        },

        error: error => {
          this.suppliers.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los proveedores.';

          this.responseModalService.show('error', 'Error al cargar proveedores', message);
        },
      });
  }

  displaySupplier(supplier: Supplier | string | null): string {

    if (!supplier) {
      return '';
    }

    if (typeof supplier === 'string') {
      return supplier;
    }

    return `${supplier.supplier_code} - ${supplier.name}`;
  }

  selectSupplier(supplier: Supplier): void {
    this.selectedSupplier = supplier;
    this.supplierControl.setValue(supplier, { emitEvent: false, });
  }

  loadProducts(search = ''): void {
    this.loadingProducts.set(true);
    this.productService
      .getOptions(search)
      .pipe(
        finalize(() => {
          this.loadingProducts.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess || !response.result) {
            this.products.set([]);
            return;
          }

          this.products.set(response.result);
        },

        error: error => {
          this.products.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los productos.';

          this.responseModalService.show('error', 'Error al cargar productos', message);
        },
      });
  }

  displayProduct(product: KitchenProduct | string | null): string {

    if (!product) {
      return '';
    }

    if (typeof product === 'string') {
      return product;
    }

    return `${product.product_reference.trim()} - ${product.product_name}`;
  }

  selectProduct(product: KitchenProduct): void {
    this.selectedProduct = product;
    this.productControl.setValue(product, { emitEvent: false, });
  }

  clearReception(): void {
    this.selectedReceptionType = null;
    this.selectedSupplier = null;
    this.selectedProduct = null;

    this.receptionTypeControl.setValue(null, {
      emitEvent: false,
    });

    this.supplierControl.setValue(null, {
      emitEvent: false,
    });

    this.productControl.setValue(null, {
      emitEvent: false,
    });

    this.guideNumberControl.setValue('');
    this.transportConditionsControl.setValue(null);
    this.suppliers.set([]);
    this.products.set([]);
    this.loadReceptionTypes();
  }

  get minimumShelfLifeDays(): number | null {
    return this.selectedProduct?.product_reception_configuration ?.minimum_shelf_life_days ?? null;
  }

  get remainingShelfLifeDays(): number | null {
    const expirationDate = this.expirationDateControl.value;

    if (!expirationDate) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiration = new Date(expirationDate);
    expiration.setHours(0, 0, 0, 0);

    const difference = expiration.getTime() - today.getTime();

    return Math.ceil(difference / (1000 * 60 * 60 * 24));
  }

  get shelfLifeComplies(): boolean | null {
    const minimumDays = this.minimumShelfLifeDays;
    const remainingDays = this.remainingShelfLifeDays;

    if (minimumDays === null || remainingDays === null) {
      return null;
    }

    return remainingDays >= minimumDays;
  }

  getTemperatureStatus(temperature: number | null): 'CUMPLE' | 'CONDICIONAL' | 'NO_CUMPLE' | null {

    if (temperature === null) {
      return null;
    }

    const config = this.selectedProduct?.product_temperature_configuration;

    if (!config) {
      return null;
    }

    if (temperature >= config.ideal_min_temperature && temperature <= config.ideal_max_temperature) {
      return 'CUMPLE';
    }

    if (config.conditional_min_temperature !== null &&
      config.conditional_max_temperature !== null &&
      temperature >= config.conditional_min_temperature &&
      temperature <= config.conditional_max_temperature
    ) {
      return 'CONDICIONAL';
    }

    if (config.rejection_min_temperature !== null &&
      config.rejection_max_temperature !== null &&
      temperature >= config.rejection_min_temperature &&
      temperature <= config.rejection_max_temperature
    ) {
      return 'NO_CUMPLE';
    }

    return 'NO_CUMPLE';
  }
}