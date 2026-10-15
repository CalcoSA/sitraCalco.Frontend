import { CreateReceptionLot, CreateReceptionLotResult, CreateReceptionLotEvaluation, ReceptionLotStatus, ReceptionMeasurementPoint, ReceptionTemperatureMeasurement } from '../../models/reception-lot.model';
import { Component, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { CreateReception, CreateReceptionResult } from '../../models/reception.model';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { KitchenProductService } from '../../services/kitchen-product.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReceptionTypeService } from '../../services/reception-type.service';
import { ResponseModalService } from '../../services/response-modal.service';
import { ReceptionLotService } from '../../services/reception-lot.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { ReceptionService } from '../../services/reception.service';
import { KitchenProduct } from '../../models/kitchen-product.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SupplierService } from '../../services/supplier.service';
import { ReceptionType } from '../../models/reception-type.model';
import { ReceptionDetail } from '../../models/reception.model';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { Supplier } from '../../models/supplier.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-receptions',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    ReactiveFormsModule,    
    MatFormFieldModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatRadioModule,
    MatIconModule,
    DatePipe,
  ],
  templateUrl: './receptions.html',
})

export class Receptions implements OnInit {

  @ViewChild('commentsDialog')
  commentsDialog!: TemplateRef<unknown>;
  @ViewChild('nonconformityDialog')
  nonconformityDialog!: TemplateRef<unknown>;

  private readonly receptionTypeService = inject(ReceptionTypeService);
  private readonly responseModalService = inject(ResponseModalService);
  private readonly receptionLotService = inject(ReceptionLotService);
  private readonly productService = inject(KitchenProductService);
  private readonly receptionService = inject(ReceptionService);
  private readonly supplierService = inject(SupplierService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);

  readonly createdReception = signal<CreateReceptionResult | null>(null);
  readonly createdLot = signal<CreateReceptionLotResult | null>(null);
  readonly receptionDetail = signal<ReceptionDetail | null>(null);
  readonly receptionTypes = signal<ReceptionType[]>([]);
  readonly expandedLotId = signal<number | null>(null);
  readonly products = signal<KitchenProduct[]>([]);
  readonly suppliers = signal<Supplier[]>([]);  

  readonly loadingReceptionDetail = signal(false);
  readonly loadingReceptionTypes = signal(false);
  readonly receptionCreated = signal(false);
  readonly loadingSuppliers = signal(false);
  readonly savingEvaluation = signal(false);
  readonly loadingProducts = signal(false);
  readonly savingReception = signal(false);
  readonly evaluationSaved = signal(false);
  readonly savingLot = signal(false);
  readonly lotSaved = signal(false);  

  readonly today = new Date();  

  readonly transportConditionsControl = this.formBuilder.control<boolean | null>(null, Validators.required);
  readonly receptionTypeControl = this.formBuilder.control<ReceptionType | string | null>(null);
  readonly conditionalTemperatureCommentsControl = this.formBuilder.nonNullable.control('');
  readonly productControl = this.formBuilder.control<KitchenProduct | string | null>(null);
  readonly commentsControl = this.formBuilder.nonNullable.control('', Validators.required);
  readonly supplierControl = this.formBuilder.control<Supplier | string | null>(null);
  readonly temperatureMiddleControl = this.formBuilder.control<number | null>(null);
  readonly nonCompliantUnitsControl = this.formBuilder.control<number | null>(null);
  readonly nonconformityCommentsControl = this.formBuilder.nonNullable.control('');
  readonly temperatureStartControl = this.formBuilder.control<number | null>(null);
  readonly temperatureEndControl = this.formBuilder.control<number | null>(null);
  readonly inspectedUnitsControl = this.formBuilder.control<number | null>(null);
  readonly compliantUnitsControl = this.formBuilder.control<number | null>(null);
  readonly otherDocumentTypeControl = this.formBuilder.nonNullable.control('');
  readonly documentNumberControl = this.formBuilder.nonNullable.control('');
  readonly expirationDateControl = this.formBuilder.nonNullable.control('');
  readonly unitCountControl = this.formBuilder.control<number | null>(null);
  readonly quantityControl = this.formBuilder.control<number | null>(null);
  readonly lotSizeControl = this.formBuilder.control<number | null>(null);
  readonly documentTypeControl = this.formBuilder.nonNullable.control('');  
  readonly guideNumberControl = this.formBuilder.nonNullable.control('');  
  readonly lotNumberControl = this.formBuilder.nonNullable.control('');

  private nonconformityDialogRef?: MatDialogRef<unknown>;
  private commentsDialogRef?: MatDialogRef<unknown>;

  commentsContext: 'TRANSPORT' | 'SHELF_LIFE' | 'TEMPERATURE' = 'TRANSPORT';
  selectedReceptionType: ReceptionType | null = null;
  nonconformityContext: 'LOT' | 'EVALUATION' = 'LOT';
  selectedProduct: KitchenProduct | null = null;
  selectedSupplier: Supplier | null = null;
  nonconformityValidationError = '';
  evaluationValidationError = '';
  commentsValidationError = '';
  lotValidationError = '';
  validationError = '';

  ngOnInit(): void {
    this.loadReceptionTypes();
    this.receptionTypeControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(value => {
        if (typeof value !== 'string') {
          return;
        }

        this.selectedReceptionType = null;
        this.selectedSupplier = null;
        this.supplierControl.setValue(null, { emitEvent: false });
        this.transportConditionsControl.setValue(null);
        this.suppliers.set([]);
        this.validationError = '';
        this.loadReceptionTypes(value);
      });

    this.supplierControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(value => {
        if (typeof value !== 'string') {
          return;
        }

        this.selectedSupplier = null;
        this.validationError = '';
        this.loadSuppliers(value);
      });

    this.productControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(value => {
        if (typeof value !== 'string' || this.lotSaved()) {
          return;
        }

        this.selectedProduct = null;
        this.resetLotFields();
        this.loadProducts(value);
      });

    this.transportConditionsControl.valueChanges.subscribe(() => {
      this.validationError = '';
    });

    this.commentsControl.valueChanges.subscribe(() => {
      this.commentsValidationError = '';
    });
  }

  loadReceptionTypes(search = ''): void {
    this.loadingReceptionTypes.set(true);
    this.receptionTypeService
      .getOptions(search)
      .pipe(finalize(() => this.loadingReceptionTypes.set(false)))
      .subscribe({
        next: response => {
          if (!response.isSuccess) {
            this.receptionTypes.set([]);
            this.responseModalService.show('error', 'Error al cargar tipos de recepción', response.message || 'No fue posible consultar los tipos de recepción.');
            return;
          }

          this.receptionTypes.set(response.result ?? []);
        },

        error: error => {
          this.receptionTypes.set([]);

          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al consultar los tipos de recepción.';

          this.responseModalService.show('error', 'Error al cargar tipos de recepción', message);
        },
      });
  }

  displayReceptionType = (receptionType: ReceptionType | string | null): string => {
    if (!receptionType) return '';
    if (typeof receptionType === 'string') return receptionType;

    return receptionType.form_code ? `${receptionType.name} - ${receptionType.form_code}` : receptionType.name;
  };

  selectReceptionType(receptionType: ReceptionType): void {
    if (this.receptionCreated()) return;

    this.selectedReceptionType = receptionType;
    this.receptionTypeControl.setValue(receptionType, { emitEvent: false, });
    this.selectedSupplier = null;
    this.supplierControl.setValue(null, { emitEvent: false });
    this.transportConditionsControl.setValue(null);
    this.commentsControl.reset();
    this.validationError = '';
    this.loadSuppliers();
  }

  loadSuppliers(search = ''): void {
    if (!this.selectedReceptionType || this.receptionCreated()) {
      return;
    }

    this.loadingSuppliers.set(true);
    this.supplierService
      .getOptions(search)
      .pipe(finalize(() => this.loadingSuppliers.set(false)))
      .subscribe({
        next: response => {
          if (!response.isSuccess) {
            this.suppliers.set([]);
            this.responseModalService.show('error', 'Error al cargar proveedores', response.message || 'No fue posible consultar los proveedores.');
            return;
          }

          this.suppliers.set(response.result ?? []);
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

  displaySupplier = (supplier: Supplier | string | null): string => {
    if (!supplier) return '';
    if (typeof supplier === 'string') return supplier;

    return `${supplier.supplier_code} - ${supplier.name}`;
  };

  selectSupplier(supplier: Supplier): void {
    if (this.receptionCreated()) return;

    this.selectedSupplier = supplier;
    this.supplierControl.setValue(supplier, { emitEvent: false, });
    this.validationError = '';
  }

  loadProducts(search = ''): void {
    if (!this.receptionCreated()) return;

    this.loadingProducts.set(true);
    this.productService
      .getOptions(search)
      .pipe(finalize(() => this.loadingProducts.set(false)))
      .subscribe({
        next: response => {
          if (!response.isSuccess) {
            this.products.set([]);
            this.responseModalService.show('error', 'Error al cargar productos', response.message || 'No fue posible consultar los productos.');
            return;
          }

          this.products.set(response.result ?? []);
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

  createReception(): void {
    if (this.receptionCreated() || this.savingReception()) {
      return;
    }

    this.validationError = '';

    if (!this.selectedReceptionType) {
      this.validationError = 'Debe seleccionar un tipo de recepción.';
      return;
    }

    if (!this.selectedSupplier) {
      this.validationError = 'Debe seleccionar un proveedor.';
      return;
    }

    if (this.transportConditionsControl.value === null) {
      this.validationError = 'Debe indicar si cumple con las condiciones de transporte.';
      return;
    }

    if (this.transportConditionsControl.value === false) {
      this.openCommentsDialog();
      return;
    }

    this.saveReception('');
  }

  private openCommentsDialog(context: 'TRANSPORT' | 'SHELF_LIFE' | 'TEMPERATURE' = 'TRANSPORT'): void {
    this.commentsContext = context;
    this.commentsControl.reset();
    this.commentsValidationError = '';

    this.commentsDialogRef = this.dialog.open(this.commentsDialog, {
      width: '100%',
      maxWidth: '600px',
      maxHeight: '90vh',
      autoFocus: false,
      disableClose: true
    });
  }

  closeCommentsDialog(): void {
    if (this.savingReception() || this.savingLot() || this.savingEvaluation()) {
      return;
    }

    this.commentsDialogRef?.close();
    this.commentsDialogRef = undefined;
    this.commentsValidationError = '';
  }

  sendReceptionWithComments(): void {
    this.commentsValidationError = '';
    const comments = this.commentsControl.value.trim();

    if (!comments) {
      this.commentsValidationError = 'Los comentarios son obligatorios.';
      return;
    }

    switch (this.commentsContext) {
      case 'TRANSPORT':
        if (!this.selectedReceptionType || !this.selectedSupplier || this.transportConditionsControl.value !== false) {
          return;
        }

        this.saveReception(comments);
        break;

      case 'SHELF_LIFE':
        if (!this.validateLot() || this.shelfLifeCompliant) {
          return;
        }

        this.saveLot('PENDING_APPROVAL', comments);
        break;

      case 'TEMPERATURE':
        this.saveEvaluation(comments);
        break;
    }
  }

  private saveReception(comments: string): void {
    if (this.receptionCreated() || this.savingReception() || !this.selectedReceptionType || !this.selectedSupplier || this.transportConditionsControl.value === null) {
      return;
    }

    const data: CreateReception = {
      reception_type_id: this.selectedReceptionType.reception_type_id,
      supplier_id: this.selectedSupplier.supplier_id,
      is_compliant: this.transportConditionsControl.value,
      comments,
    };

    this.savingReception.set(true);
    this.receptionService
      .create(data)
      .pipe(finalize(() => this.savingReception.set(false)))
      .subscribe({
        next: response => {
          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('error', 'Error al crear recepción', response.message || 'No fue posible crear la recepción.');
            return;
          }

          this.createdReception.set(response.result);
          this.receptionDetail.set(null);
          this.expandedLotId.set(null);
          this.loadReceptionDetail();
          this.receptionCreated.set(true);
          this.commentsDialogRef?.close();
          this.commentsDialogRef = undefined;
          this.commentsValidationError = '';
          this.receptionTypeControl.disable({ emitEvent: false });
          this.supplierControl.disable({ emitEvent: false });
          this.transportConditionsControl.disable({ emitEvent: false });
          this.validationError = '';
          this.loadProducts();
          this.responseModalService.show('success', 'Recepción creada', response.message || 'La recepción se creó correctamente.');
        },

        error: error => {
          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al crear la recepción.';

          this.responseModalService.show('error', 'Error al crear recepción', message);
        },
      });
  }

  displayProduct = (product: KitchenProduct | string | null): string => {
    if (!product) return '';
    if (typeof product === 'string') return product;

    return `${product.product_reference.trim()} - ${product.product_name} - ${product.unit_of_measure}`;
  };

  selectProduct(product: KitchenProduct): void {
    if (this.lotSaved() || this.savingLot()) return;

    this.selectedProduct = product;
    this.productControl.setValue(product, { emitEvent: false });

    this.resetLotFields();
  }

  get requiresGuide(): boolean {
    return this.selectedProduct ?.product_reception_configuration?.requires_guide === true;
  }

  get requiresShelfLife(): boolean {
    return this.selectedProduct ?.product_reception_configuration?.requires_shelf_life === true;
  }

  get minimumShelfLifeDays(): number {
    return this.selectedProduct ?.product_reception_configuration?.minimum_shelf_life_days ?? 0;
  }

  get shelfLifeDaysRemaining(): number | null {
    const value = this.expirationDateControl.value;

    if (!value) return null;

    const expiration = new Date(`${value}T00:00:00`);

    if (Number.isNaN(expiration.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expirationUtc = Date.UTC(
      expiration.getFullYear(),
      expiration.getMonth(),
      expiration.getDate()
    );

    const todayUtc = Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    return Math.round(
      (expirationUtc - todayUtc) / 86400000
    );
  }

  get shelfLifeCompliant(): boolean {
    if (!this.requiresShelfLife) return true;

    const days = this.shelfLifeDaysRemaining;
    return days !== null && days >= this.minimumShelfLifeDays;
  }

  get showLotActions(): boolean {
    return !!this.selectedProduct && !this.lotSaved();
  }

  private resetLotFields(): void {
    this.createdLot.set(null);
    this.evaluationSaved.set(false);
    this.temperatureStartControl.enable({ emitEvent: false });
    this.temperatureMiddleControl.enable({ emitEvent: false });
    this.temperatureEndControl.enable({ emitEvent: false });
    this.inspectedUnitsControl.enable({ emitEvent: false });
    this.compliantUnitsControl.enable({ emitEvent: false });
    this.nonCompliantUnitsControl.enable({ emitEvent: false });
    this.temperatureStartControl.reset();
    this.temperatureMiddleControl.reset();
    this.temperatureEndControl.reset();
    this.inspectedUnitsControl.reset();
    this.inspectedUnitsControl.enable({ emitEvent: false });
    this.compliantUnitsControl.reset();
    this.nonCompliantUnitsControl.reset();
    this.lotNumberControl.reset();
    this.guideNumberControl.reset();
    this.expirationDateControl.reset();
    this.lotSizeControl.reset();
    this.unitCountControl.reset();
    this.documentTypeControl.reset();
    this.otherDocumentTypeControl.reset();
    this.documentNumberControl.reset();
    this.quantityControl.reset();
    this.nonconformityCommentsControl.reset();
    this.conditionalTemperatureCommentsControl.reset();

    this.evaluationValidationError = '';
    this.nonconformityContext = 'LOT';
    this.lotValidationError = '';
    this.nonconformityValidationError = '';
  }

  private prepareNextLot(): void {
    this.productControl.enable({ emitEvent: false });
    this.lotNumberControl.enable({ emitEvent: false });
    this.guideNumberControl.enable({ emitEvent: false });
    this.expirationDateControl.enable({ emitEvent: false });
    this.lotSizeControl.enable({ emitEvent: false });
    this.unitCountControl.enable({ emitEvent: false });
    this.selectedProduct = null;
    this.productControl.reset(null, { emitEvent: false });
    this.resetLotFields();
    this.lotSaved.set(false);
    this.loadProducts();
  }

  private validateLot(): boolean {
    this.lotValidationError = '';

    if (!this.createdReception()?.reception_id) {
      this.lotValidationError = 'No existe una recepción creada.';
      return false;
    }

    if (!this.selectedProduct) {
      this.lotValidationError = 'Debe seleccionar un producto.';
      return false;
    }

    if (!this.lotNumberControl.value.trim()) {
      this.lotValidationError = 'El número de lote es obligatorio.';
      return false;
    }

    if (this.requiresGuide && !this.guideNumberControl.value.trim()) {
      this.lotValidationError = 'El número de guía es obligatorio.';
      return false;
    }

    if (this.requiresShelfLife && this.shelfLifeDaysRemaining === null) {
      this.lotValidationError = 'Debe seleccionar la fecha de vencimiento.';
      return false;
    }

    const lotSize = this.lotSizeControl.value;
    const unitCount = this.unitCountControl.value;

    if (lotSize !== null && (!Number.isFinite(lotSize) || lotSize <= 0)) {
      this.lotValidationError = 'El tamaño del lote debe ser mayor que cero.';
      return false;
    }

    if (unitCount !== null && (!Number.isInteger(unitCount) || unitCount <= 0)) {
      this.lotValidationError = 'La cantidad de unidades debe ser un entero mayor que cero.';
      return false;
    }

    return true;
  }

  saveApprovedLot(): void {
    if (!this.validateLot()) return;

    if (!this.shelfLifeCompliant) {
      this.lotValidationError = 'La vida útil no cumple. Seleccione Condicional o Rechazar.';
      return;
    }

    this.saveLot();
  }

  private saveLot(status?: ReceptionLotStatus, comments: string | null = null, documentType: string | null = null, documentNumber: string | null = null, quantity: number | null = null): void {
    
    if (this.savingLot() || this.lotSaved() || !this.validateLot() || !this.selectedProduct) {
      return;
    }

    const receptionId = this.createdReception()?.reception_id;

    if (!receptionId) return;

    const data: CreateReceptionLot = {
      reception_id: receptionId,
      product_id: this.selectedProduct.product_id,
      lot_number: this.lotNumberControl.value.trim(),
      guide_number: this.requiresGuide ? this.guideNumberControl.value.trim() : null,
      expiration_date: this.requiresShelfLife ? this.expirationDateControl.value : null,
      lot_size: this.lotSizeControl.value,
      unit_count: this.unitCountControl.value,
      ...(status !== undefined ? { lot_status: status } : {}),
      shelf_life_comments: comments,
      document_type: documentType,
      document_number: documentNumber,
      quantity,
    };

    this.savingLot.set(true);
    this.receptionLotService
      .create(data)
      .pipe(finalize(() => this.savingLot.set(false)))
      .subscribe({
        next: response => {
          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('error', 'Error al registrar lote', response.message || 'No fue posible registrar el lote.');
            return;
          }

          this.loadReceptionDetail();
          this.commentsDialogRef?.close();
          this.nonconformityDialogRef?.close();
          this.commentsDialogRef = undefined;
          this.nonconformityDialogRef = undefined;
          this.commentsValidationError = '';

          if (response.result.lot_status === 'REJECTED') {
            this.prepareNextLot();
          } else {
            this.createdLot.set(response.result);
            if (response.result.requires_visual_inspection) {
              const units = this.unitCountControl.value;

              if (units !== null && units > 0) {
                this.inspectedUnitsControl.setValue(units);
                this.inspectedUnitsControl.disable({ emitEvent: false });
              } else {
                this.inspectedUnitsControl.enable({ emitEvent: false });
              }
            }

            this.lotSaved.set(true);
            this.productControl.disable({ emitEvent: false });
            this.lotNumberControl.disable({ emitEvent: false });
            this.guideNumberControl.disable({ emitEvent: false });
            this.expirationDateControl.disable({ emitEvent: false });
            this.lotSizeControl.disable({ emitEvent: false });
            this.unitCountControl.disable({ emitEvent: false });

            if (!this.requiresEvaluation) {
              this.prepareNextLot();
            }
          }

          this.responseModalService.show('success', status === 'REJECTED' ? 'Lote rechazado' : status === 'PENDING_APPROVAL' ? 'Lote pendiente de aprobación' : 'Lote registrado', response.message || 'Operación realizada correctamente.');
        },

        error: error => {
          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al registrar el lote.';

          this.responseModalService.show('error', 'Error al registrar lote', message);
        },
      });
  }

  openNonconformityDialog(): void {
    if (this.nonconformityContext === 'EVALUATION') {
      if (!this.validateEvaluation()) return;
    } else {
      if (!this.validateLot() || this.shelfLifeCompliant) return;
    }

    this.documentTypeControl.reset();
    this.otherDocumentTypeControl.reset();
    this.documentNumberControl.reset();
    this.quantityControl.reset();
    this.nonconformityCommentsControl.reset();
    this.conditionalTemperatureCommentsControl.reset();
    this.nonconformityValidationError = '';

    this.nonconformityDialogRef = this.dialog.open(
      this.nonconformityDialog,
      {
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        autoFocus: false,
        disableClose: true,
      }
    );
  }

  closeNonconformityDialog(): void {
    if (this.savingLot() || this.savingEvaluation()) return;

    this.nonconformityDialogRef?.close();
    this.nonconformityDialogRef = undefined;
    this.nonconformityValidationError = '';
  }

  selectDocumentType(value: string): void {
    this.documentTypeControl.setValue(value);
    this.otherDocumentTypeControl.reset();
    this.nonconformityValidationError = '';
  }

  onOtherDocumentTypeChange(): void {
    if (this.otherDocumentTypeControl.value.trim()) {
      this.documentTypeControl.reset();
    }

    this.nonconformityValidationError = '';
  }

  sendRejectedLot(): void {
    this.nonconformityValidationError = '';
    const documentType = this.otherDocumentTypeControl.value.trim() || this.documentTypeControl.value;
    const documentNumber = this.documentNumberControl.value.trim();
    const comments = this.nonconformityCommentsControl.value.trim();

    if (!documentType) {
      this.nonconformityValidationError = 'Debe seleccionar o escribir un tipo de documento.';
      return;
    }

    if (!comments) {
      this.nonconformityValidationError = 'Los comentarios son obligatorios.';
      return;
    }

    if (this.nonconformityContext === 'EVALUATION') {
      const temperatureComments = this.showConditionalTemperatureComments ? this.conditionalTemperatureCommentsControl.value.trim() : comments;

      if (this.showConditionalTemperatureComments && !temperatureComments) {
        this.nonconformityValidationError ='Debe explicar las temperaturas en rango condicional.';
        return;
      }

      this.saveEvaluation(comments, documentType, documentNumber || null, temperatureComments);
      return;
    }

    const quantity = this.quantityControl.value;

    if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) {
      this.nonconformityValidationError = 'La cantidad debe ser un número válido.';
      return;
    }

    if (this.shelfLifeCompliant) return;

    this.saveLot('REJECTED', comments, documentType, documentNumber || null, quantity);
  }

  get requiresEvaluation(): boolean {
    const lot = this.createdLot();
    return !!lot && (lot.requires_temperature || lot.requires_visual_inspection);
  }

  get temperatureRanges() {
    return this.selectedProduct?.product_temperature_configuration ?? null;
  }

  private inTemperatureRange(value: number, min: number | null, max: number | null): boolean {
    if (min === null && max === null) return false;

    return (min === null || value >= min) && (max === null || value <= max);
  }

  getTemperatureBorderColor(value: number | null): string | null {
    const config = this.temperatureRanges;
    console.log('Temperatura:', value, 'Configuración:', config);

    if (value === null || !Number.isFinite(value) || !config) {
      return null;
    }

    if (this.inTemperatureRange(value, config.rejection_min_temperature, config.rejection_max_temperature)) {
      return '#b3261e';
    }

    if (this.inTemperatureRange(value, config.conditional_min_temperature, config.conditional_max_temperature)) {
      return '#986100';
    }

    if (this.inTemperatureRange(value, config.ideal_min_temperature, config.ideal_max_temperature)) {
      return '#2e7d32';
    }

    return null;
  }

  get temperatureStatus(): 'IDEAL' | 'CONDITIONAL' | 'REJECTED' | 'INCOMPLETE' {

    if (!this.createdLot()?.requires_temperature) {
      return 'IDEAL';
    }

    const config = this.temperatureRanges;

    const values = [
      this.temperatureStartControl.value,
      this.temperatureMiddleControl.value,
      this.temperatureEndControl.value
    ];

    if (!config || values.some(value => value === null || !Number.isFinite(value))) {
      return 'INCOMPLETE';
    }

    let hasConditional = false;
    let hasRejected = false;

    for (const value of values as number[]) {

      if (this.inTemperatureRange(value, config.rejection_min_temperature, config.rejection_max_temperature)) {
        hasRejected = true;
        continue;
      }

      if (this.inTemperatureRange(value, config.conditional_min_temperature, config.conditional_max_temperature)) {
        hasConditional = true;
        continue;
      }

      if (!this.inTemperatureRange(value, config.ideal_min_temperature, config.ideal_max_temperature)) {
        return 'INCOMPLETE';
      }
    }

    if (hasRejected) return 'REJECTED';
    if (hasConditional) return 'CONDITIONAL';

    return 'IDEAL';
  }

  get hasNonCompliantUnits(): boolean {
    return (this.nonCompliantUnitsControl.value ?? 0) > 0;
  }

  get evaluationAction(): 'SAVE' | 'CONDITIONAL' | 'REJECTED' {

    if (this.temperatureStatus === 'REJECTED' || this.hasNonCompliantUnits) {
      return 'REJECTED';
    }

    if (this.temperatureStatus === 'CONDITIONAL') {
      return 'CONDITIONAL';
    }

    return 'SAVE';
  }

  get evaluationButtonLabel(): string {
    switch (this.evaluationAction) {
      case 'REJECTED':
        return 'Rechazar';

      case 'CONDITIONAL':
        return 'Condicional';

      default:
        return 'Guardar';
    }
  }

  private validateEvaluation(): boolean {
    this.evaluationValidationError = '';
    const lot = this.createdLot();

    if (!lot || this.evaluationSaved()) {
      this.evaluationValidationError = 'No existe un lote pendiente de evaluación.';
      return false;
    }

    if (lot.requires_temperature && this.temperatureStatus === 'INCOMPLETE') {
      this.evaluationValidationError = 'Ingrese las tres temperaturas dentro de los rangos configurados.';
      return false;
    }

    if (lot.requires_visual_inspection && this.temperatureStatus !== 'REJECTED') {
      const inspected = this.inspectedUnitsControl.value;
      const compliant = this.compliantUnitsControl.value;
      const nonCompliant = this.nonCompliantUnitsControl.value ?? 0;

      if (inspected === null || compliant === null || nonCompliant === null || !Number.isInteger(inspected) || !Number.isInteger(compliant) || !Number.isInteger(nonCompliant) || inspected <= 0 || compliant < 0 || nonCompliant < 0) {
        this.evaluationValidationError = 'Ingrese cantidades válidas para la inspección visual.';
        return false;
      }

      if (compliant + nonCompliant !== inspected) {
        this.evaluationValidationError = 'Las unidades conformes y no conformes deben sumar las inspeccionadas.';
        return false;
      }
    }

    return true;
  }

  private buildTemperatureMeasurements(comments: string): ReceptionTemperatureMeasurement[] {

    if (!this.createdLot()?.requires_temperature) {
      return [];
    }

    const values: { point: ReceptionMeasurementPoint; value: number | null;}[] = [
      { point: 'START', value: this.temperatureStartControl.value },
      { point: 'MIDDLE', value: this.temperatureMiddleControl.value },
      { point: 'END', value: this.temperatureEndControl.value }
    ];

    const config = this.temperatureRanges;

    return values.map(item => {
      const temperature = item.value!;
      const isIdeal = !!config && this.inTemperatureRange(temperature, config.ideal_min_temperature, config.ideal_max_temperature);

      return {
        measurement_point: item.point,
        temperature_celsius: temperature,
        comments: isIdeal ? '' : comments
      };
    });
  }

  private saveEvaluation(comments = '', documentType: string | null = null, documentNumber: string | null = null, temperatureComments = comments): void {

    if (this.savingEvaluation() || this.evaluationSaved() || !this.validateEvaluation()) {
      return;
    }

    const lot = this.createdLot()!;
    const data: CreateReceptionLotEvaluation = {
      reception_lot_id: lot.reception_lot_id,
      temperature_measurements: this.buildTemperatureMeasurements(temperatureComments),
      visual_inspection: lot.requires_visual_inspection && this.temperatureStatus !== 'REJECTED'
        ? {
            inspected_units: this.inspectedUnitsControl.value,
            compliant_units: this.compliantUnitsControl.value!,
            non_compliant_units: this.nonCompliantUnitsControl.value ?? 0,
            comments: this.hasNonCompliantUnits ? comments : ''
          }
        : null,
      document_type: documentType,
      document_number: documentNumber
    };

    this.savingEvaluation.set(true);
    this.receptionLotService
      .createEvaluation(data)
      .pipe(finalize(() => this.savingEvaluation.set(false)))
      .subscribe({
        next: response => {

          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('error', 'Error al evaluar lote', response.message || 'No fue posible registrar la evaluación.');
            return;
          }

          this.loadReceptionDetail();
          
          this.commentsDialogRef?.close();
          this.nonconformityDialogRef?.close();

          this.commentsDialogRef = undefined;
          this.nonconformityDialogRef = undefined;
          this.commentsValidationError = '';

          this.prepareNextLot();

          this.responseModalService.show('success', 'Lote registrado', response.message || 'El lote se registró correctamente.');
        },

        error: error => {
          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al registrar la evaluación.';

          this.responseModalService.show('error', 'Error al evaluar lote', message);
        }
      });
  }

  submitEvaluation(): void {
    if (!this.validateEvaluation()) return;

    switch (this.evaluationAction) {
      case 'REJECTED':
        this.nonconformityContext = 'EVALUATION';
        this.openNonconformityDialog();
        break;

      case 'CONDITIONAL':
        this.openCommentsDialog('TEMPERATURE');
        break;

      default:
        this.saveEvaluation();
        break;
    }
  }

  openShelfLifeComments(): void {
    if (!this.validateLot() || this.shelfLifeCompliant) return;

    this.openCommentsDialog('SHELF_LIFE');
  }

  openShelfLifeNonconformity(): void {
    this.nonconformityContext = 'LOT';
    this.openNonconformityDialog();
  }

  get showConditionalTemperatureComments(): boolean {
    return (this.nonconformityContext === 'EVALUATION' && this.temperatureStatus === 'CONDITIONAL' && this.hasNonCompliantUnits);
  }

  loadReceptionDetail(): void {
    const receptionId = this.createdReception()?.reception_id;

    if (!receptionId) return;

    this.loadingReceptionDetail.set(true);
    this.receptionService
      .getById(receptionId)
      .pipe(finalize(() => this.loadingReceptionDetail.set(false)))
      .subscribe({
        next: response => {
          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('error', 'Error al consultar recepción', response.message || 'No fue posible consultar los lotes de la recepción.');
            return;
          }

          this.receptionDetail.set(response.result);
        },

        error: error => {
          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al consultar los lotes de la recepción.';

          this.responseModalService.show('error', 'Error al consultar recepción', message);
        }
      });
  }

  toggleLotDetail(lotId: number): void {
    this.expandedLotId.update(current =>
      current === lotId ? null : lotId
    );
  }

  getLotStatusLabel(status: string): string {
    switch (status) {
      case 'APPROVED': return 'Aprobado';
      case 'REJECTED': return 'Rechazado';
      case 'PENDING_APPROVAL': return 'Pendiente';
      default: return status;
    }
  }

  getTemperaturePointLabel(point: string): string {
    switch (point) {
      case 'START': return 'Inicial';
      case 'MIDDLE': return 'Mitad';
      case 'END': return 'Final';
      default: return point;
    }
  }

  getTemperatureStatusLabel(status: string): string {
    switch (status) {
      case 'IDEAL': return 'Ideal';
      case 'CONDITIONAL': return 'Condicional';
      case 'REJECTED': return 'Rechazado';
      default: return status;
    }
  }

  getNonconformityReasonLabel(reason: string): string {
    switch (reason) {
      case 'SHELF_LIFE': return 'Vida útil';
      case 'TEMPERATURE': return 'Temperatura';
      case 'VISUAL_INSPECTION': return 'Inspección visual';
      default: return reason;
    }
  }

  finishReception(): void {

    if (this.savingReception() || this.savingLot() || this.savingEvaluation()) {
      return;
    }

    this.createdReception.set(null);
    this.createdLot.set(null);
    this.receptionDetail.set(null);
    this.expandedLotId.set(null);
    this.receptionCreated.set(false);
    this.lotSaved.set(false);
    this.evaluationSaved.set(false);
    this.receptionTypeControl.enable({ emitEvent: false });
    this.supplierControl.enable({ emitEvent: false });
    this.transportConditionsControl.enable({ emitEvent: false });
    this.productControl.enable({ emitEvent: false });
    this.lotNumberControl.enable({ emitEvent: false });
    this.guideNumberControl.enable({ emitEvent: false });
    this.expirationDateControl.enable({ emitEvent: false });
    this.lotSizeControl.enable({ emitEvent: false });
    this.unitCountControl.enable({ emitEvent: false });
    this.selectedProduct = null;
    this.selectedSupplier = null;
    this.productControl.reset(null, { emitEvent: false });
    this.supplierControl.reset(null, { emitEvent: false });
    this.transportConditionsControl.reset(null, { emitEvent: false });
    this.resetLotFields();
    this.commentsControl.reset();
    this.commentsValidationError = '';
    this.validationError = '';
    this.suppliers.set([]);
    this.products.set([]);
    this.loadReceptionTypes();
  }
}