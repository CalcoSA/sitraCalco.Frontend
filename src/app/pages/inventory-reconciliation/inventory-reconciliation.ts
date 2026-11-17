import { InventoryCountNumber, InventoryHistoryCount, InventoryHistoryDay, InventoryHistoryProduct, } from '../../models/inventory.model';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule, NativeDateAdapter, } from '@angular/material/core';
import { InventoryAvailableOption, InventoryAvailableSectionOption, } from '../../models/inventory-configuration.model';
import { InventoryConfigurationService, } from '../../services/inventory-configuration.service';
import { SolutionCenterService, } from '../../services/solution-center.service';
import { MatProgressSpinnerModule, } from '@angular/material/progress-spinner';
import { ResponseModalService, } from '../../services/response-modal.service';
import { Component, computed, inject, OnInit, signal, } from '@angular/core';
import { SolutionCenter, } from '../../models/solution-center.model';
import { InventoryService, } from '../../services/inventory.service';
import { MatDatepickerModule, } from '@angular/material/datepicker';
import { FormBuilder, ReactiveFormsModule, } from '@angular/forms';
import { MatFormFieldModule, } from '@angular/material/form-field';
import { SectionService, } from '../../services/section.service';
import { MatTooltipModule, } from '@angular/material/tooltip';
import { MatSelectModule, } from '@angular/material/select';
import { MatButtonModule, } from '@angular/material/button';
import { MatInputModule, } from '@angular/material/input';
import { MatIconModule, } from '@angular/material/icon';
import { finalize, } from 'rxjs';

const COLOMBIAN_DATE_INPUT_FORMAT = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

const COLOMBIAN_DATE_FORMATS = {
  parse: {
    dateInput: COLOMBIAN_DATE_INPUT_FORMAT,
  },

  display: {
    dateInput: COLOMBIAN_DATE_INPUT_FORMAT,

    monthYearLabel: {
      month: 'short',
      year: 'numeric',
    },

    dateA11yLabel: {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    },

    monthYearA11yLabel: {
      month: 'long',
      year: 'numeric',
    },
  },
};

class ColombianDateAdapter extends NativeDateAdapter {

  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === COLOMBIAN_DATE_INPUT_FORMAT) {

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    }

    return super.format(date, displayFormat);
  }
}

@Component({
  selector: 'app-inventory-reconciliation',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatNativeDateModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatSelectModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
  ],
  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-CO',
    },
    {
      provide: DateAdapter,
      useClass: ColombianDateAdapter,
    },
    {
      provide: MAT_DATE_FORMATS,
      useValue: COLOMBIAN_DATE_FORMATS,
    },
  ],
  templateUrl: './inventory-reconciliation.html',
})

export class InventoryReconciliation implements OnInit {  

  private readonly inventoryConfigurationService = inject(InventoryConfigurationService);
  private readonly solutionCenterService = inject(SolutionCenterService);
  private readonly responseModalService = inject(ResponseModalService);
  private readonly inventoryService = inject(InventoryService);
  private readonly sectionService = inject(SectionService);
  private readonly formBuilder = inject(FormBuilder);  
  
  readonly selectedSolutionCenter = signal<SolutionCenter | null>(null);
  readonly sections = signal<InventoryAvailableSectionOption[]>([]);
  readonly inventories = signal<InventoryAvailableOption[]>([]);
  readonly solutionCenters = signal<SolutionCenter[]>([]);
  readonly history = signal<InventoryHistoryDay[]>([]);

  readonly loadingSolutionCenters = signal(false);
  readonly loadingInventories = signal(false);
  readonly loadingSections = signal(false);
  readonly loadingHistory = signal(false);
  readonly validationError = signal('');

  readonly filterForm = this.formBuilder.group({
    from: this.formBuilder.control<Date | null>(null),
    to: this.formBuilder.control<Date | null>(null),
    solutionCenterId: this.formBuilder.control<number | null>(null),
    inventoryConfigurationId: this.formBuilder.control<number | null>({ value: null, disabled: true, }),
    sectionId: this.formBuilder.control<number | null>({ value: null, disabled: true, }),
  });

  readonly tableProducts =
    computed<InventoryHistoryProduct[]>(
      () => {

        const products = new Map<string, InventoryHistoryProduct>();

        for (const day of this.history()) {
          for (const product of day.products) {
            if (!products.has(product.reference)) {
              products.set(product.reference, product);
            }
          }
        }

        return [ ...products.values(), ];
      }
    );

  ngOnInit(): void {
    this.loadSolutionCenters();
  }

  private loadSolutionCenters(): void {
    this.loadingSolutionCenters.set(true);
    this.solutionCenterService
      .getAllCenters()
      .pipe(
        finalize(
          () => {
            this.loadingSolutionCenters.set(false);
          }
        )
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.solutionCenters.set([]);
            this.responseModalService.show('error', 'Error al cargar', response.message || 'No fue posible consultar los centros de solución.');
            return;
          }

          this.solutionCenters.set((response.result ?? []).filter(center => center.isActive));
        },

        error: error => {
          this.solutionCenters.set([]);
          this.showHttpError(error, 'Error al consultar centros', 'Ocurrió un error al consultar los centros de solución.');
        },
      });
  }

  onSolutionCenterSelected(solutionCenterId: number | null): void {
    this.history.set([]);
    this.inventories.set([]);
    this.sections.set([]);
    this.selectedSolutionCenter.set(null);

    this.filterForm.controls.inventoryConfigurationId.reset(null, { emitEvent: false, });
    this.filterForm.controls.sectionId.reset(null, { emitEvent: false, });
    this.filterForm.controls.inventoryConfigurationId.disable({ emitEvent: false,});
    this.filterForm.controls.sectionId.disable({ emitEvent: false, });

    if (!solutionCenterId) {
      return;
    }

    const selected = this.solutionCenters().find(center => center.solutionCenterId === solutionCenterId) ?? null;

    this.selectedSolutionCenter.set(selected);
    this.loadingInventories.set(true);
    this.inventoryConfigurationService
      .getAllConfigurations(solutionCenterId)
      .pipe(
        finalize(
          () => {
            this.loadingInventories.set(false);
          }
        )
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.inventories.set([]);
            return;
          }

          this.inventories.set(response.result ?? []);
          this.filterForm.controls.inventoryConfigurationId.enable({ emitEvent: false, });
        },

        error: error => {
          this.inventories.set([]);
          this.showHttpError(error, 'Error al consultar inventarios', 'Ocurrió un error al consultar las configuraciones de inventario.');
        },
      });
  }

  onInventorySelected(inventoryConfigurationId: number | null): void {
    this.history.set([]);
    this.sections.set([]);

    this.filterForm.controls.sectionId.reset(null, { emitEvent: false, });
    this.filterForm.controls.sectionId.disable({ emitEvent: false, });

    const solutionCenterId = this.filterForm.controls.solutionCenterId.value;

    if (!solutionCenterId || !inventoryConfigurationId) {
      return;
    }

    this.loadingSections.set(true);
    this.sectionService
      .getAllByConfiguration(solutionCenterId, inventoryConfigurationId)
      .pipe(
        finalize(
          () => {
            this.loadingSections.set(false);
          }
        )
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.sections.set([]);
            return;
          }

          this.sections.set(response.result ?? []);

          this.filterForm.controls.sectionId.enable({ emitEvent: false, });
        },

        error: error => {
          this.sections.set([]);
          this.showHttpError(error, 'Error al consultar secciones', 'Ocurrió un error al consultar las secciones.');
        },
      });
  }

  onSectionSelected(): void {
    this.history.set([]);
  }

  searchHistory(): void {

    if (this.loadingHistory()) {
      return;
    }

    this.validationError.set('');

    const { from, to, solutionCenterId, inventoryConfigurationId, sectionId, } = this.filterForm.getRawValue();

    if (!from) {
      this.validationError.set('Debes seleccionar la fecha inicial.');
      return;
    }

    if (!solutionCenterId || !inventoryConfigurationId || !sectionId) {
      this.validationError.set('Debes seleccionar el centro de solución, el inventario y la sección.');
      return;
    }

    if (to && from.getTime() > to.getTime()) {
      this.validationError.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    const fromValue = this.formatDate(from);
    const toValue = to ? this.formatDate(to) : null;

    this.loadingHistory.set(true);
    this.inventoryService
      .getHistory(fromValue, toValue, solutionCenterId, inventoryConfigurationId, sectionId)
      .pipe(
        finalize(
          () => {
            this.loadingHistory.set(false);
          }
        )
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.history.set([]);
            this.responseModalService.show('warning', 'Sin resultados', response.message || 'No se encontraron inventarios para los filtros seleccionados.');
            return;
          }

          this.history.set(response.result ?? []);
        },

        error: error => {
          this.history.set([]);
          this.showHttpError(error, 'Error al consultar historial', 'Ocurrió un error al consultar el historial de inventarios.');
        },
      });
  }

  clearFilters(): void {

    if (this.loadingHistory()) {
      return;
    }

    this.filterForm.reset({ from: null, to: null, solutionCenterId: null, inventoryConfigurationId: null, sectionId: null, });
    this.filterForm.controls.inventoryConfigurationId.disable({ emitEvent: false, });
    this.filterForm.controls.sectionId.disable({ emitEvent: false, });

    this.selectedSolutionCenter.set(null);
    this.inventories.set([]);
    this.sections.set([]);
    this.history.set([]);
    this.validationError.set('');
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  formatHistoryDate(value: string): string {
    const [ year, month, day, ] = value.split('-');

    if (!year || !month || !day) {
      return value;
    }

    return `${day}/${month}/${year}`;
  }

  getCountNumbers(day: InventoryHistoryDay): InventoryCountNumber[] {
    const numbers = new Set<InventoryCountNumber>();

    for (const product of day.products) {
      for (const count of product.counts) {
        if (count.countNumber === 1 || count.countNumber === 2 || count.countNumber === 3) {
          numbers.add(count.countNumber);
        }
      }
    }

    return [ ...numbers, ].sort((a, b) => a - b);
  }

  getHistoryCount(day: InventoryHistoryDay, reference: string, countNumber: InventoryCountNumber): InventoryHistoryCount | null {
    const product = day.products.find(item => item.reference === reference);

    if (!product) {
      return null;
    }

    return (product.counts.find(count => count.countNumber === countNumber) ?? null);
  }

  get isWarehouse(): boolean {
    return (this.selectedSolutionCenter() ?.solutionCenterTypeId === 1);
  }

  get isPointOfSale(): boolean {
    return (this.selectedSolutionCenter() ?.solutionCenterTypeId === 2);
  }

  getDateColumnSpan(day: InventoryHistoryDay): number {
    const counts = this.getCountNumbers(day).length;
    return this.isWarehouse ? counts * 2 : counts * 3;
  }

  private showHttpError(error: any, title: string, fallback: string): void {
    const message = error.status === 0 ? 'No fue posible comunicarse con el servidor.' : error.error?.message || fallback;
    this.responseModalService.show('error', title, message);
  }
}