import { InventorySectionProduct, InventoryProductDraft, InventoryDraft, InventoryCreate, InventoryCountNumber, InventoryStoredCount, } from '../../models/inventory.model';
import { InventoryAvailableOption, InventoryAvailableSectionOption, } from '../../models/inventory-configuration.model';
import { InventoryConfigurationService, } from '../../services/inventory-configuration.service';
import { SolutionCenterService, } from '../../services/solution-center.service';
import { InventoryDraftService, } from '../../services/inventory-draft.service';
import { ResponseModalService, } from '../../services/response-modal.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventoryService, } from '../../services/inventory.service';
import { SolutionCenter, } from '../../models/solution-center.model';
import { Component, inject, OnInit, signal, } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SessionService, } from '../../services/session.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-inventories',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatSelectModule,
    MatButtonModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,    
  ],
  templateUrl: './inventories.html',
})

export class Inventories implements OnInit {

  private readonly inventoryConfigurationService = inject(InventoryConfigurationService);
  private readonly solutionCenterService = inject(SolutionCenterService);
  private readonly inventoryDraftService = inject(InventoryDraftService); 
  private readonly responseModalService = inject(ResponseModalService);
  private readonly inventoryService = inject(InventoryService);
  private readonly sessionService = inject(SessionService);  
  private readonly formBuilder = inject(FormBuilder);

  readonly savedCounts = signal<Record<number, Partial<Record<InventoryCountNumber, InventoryStoredCount>>>>({});
  readonly productDrafts = signal<Record<number, InventoryProductDraft>>({});
  readonly selectedSolutionCenter = signal<SolutionCenter | null>(null);
  readonly activeCountNumber = signal<InventoryCountNumber | null>(1);
  readonly sections = signal<InventoryAvailableSectionOption[]>([]);
  readonly savedCountNumbers = signal<InventoryCountNumber[]>([]);  
  readonly inventories = signal<InventoryAvailableOption[]>([]);
  readonly inventoryExecutionId = signal<string | null>(null);  
  readonly products = signal<InventorySectionProduct[]>([]);
  readonly solutionCenters = signal<SolutionCenter[]>([]);

  readonly loadingSolutionCenters = signal(false);
  readonly loadingInventories = signal(false);
  readonly canViewFullDetail = signal(false);
  readonly loadingSections = signal(false);
  readonly loadingProducts = signal(false);
  readonly savingInventory = signal(false);
  readonly loadingCounts = signal(false);
  
  readonly inventoryControl = this.formBuilder.control<number | null>({ value: null, disabled: true, });
  readonly sectionControl = this.formBuilder.control<number | null>({ value: null, disabled: true, });
  readonly solutionCenterControl = this.formBuilder.control<number | null>(null);

  readonly countNumbers: InventoryCountNumber[] = [1, 2, 3,];
  
  private currentDraft: InventoryDraft | null = null;

  private currentDraftKey = '';

  ngOnInit(): void {
    this.loadSolutionCenters();
  }

  private loadSolutionCenters(): void {
    const user = this.sessionService.getUser();

    if (!user) {
      this.responseModalService.show('error', 'Error al cargar', 'No fue posible obtener la información del usuario autenticado.');
      return;
    }

    const role = user.nameRole?.trim();

    if (!role) {
      this.responseModalService.show('error', 'Error al cargar', 'No fue posible identificar el rol del usuario autenticado.');
      return;
    }

    this.loadingSolutionCenters.set(true);
    this.solutionCenterService
      .getAllForInventory(role)
      .pipe(
        finalize(() => {
          this.loadingSolutionCenters.set(false);
        })
      )
      .subscribe({
        next: solutionCenters => {
          this.solutionCenters.set(
            (solutionCenters ?? [])
              .filter(
                solutionCenter =>
                  solutionCenter.isActive
              )
          );
        },

        error: error => {
          this.solutionCenters.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar las bodegas y puntos de venta.';

          this.responseModalService.show('error', 'Error al cargar', message);
        },
      });
  }

  onSolutionCenterSelected(solutionCenterId: number | null): void {
    this.products.set([]);
    this.productDrafts.set({});
    this.currentDraft = null;
    this.currentDraftKey = '';
    this.selectedSolutionCenter.set(null);
    this.inventoryControl.reset(null, { emitEvent: false, });
    this.sectionControl.reset(null, { emitEvent: false, });
    this.inventories.set([]);
    this.sections.set([]);
    this.inventoryControl.disable({ emitEvent: false, });
    this.sectionControl.disable({ emitEvent: false, });

    if (!solutionCenterId) {
      return;
    }

    const selected = this.solutionCenters().find(solutionCenter => solutionCenter.solutionCenterId === solutionCenterId) ?? null;

    this.selectedSolutionCenter.set(selected);
    this.loadingInventories.set(true);
    this.inventoryConfigurationService
      .getAvailableInventories(
        solutionCenterId
      )
      .pipe(
        finalize(() => {
          this.loadingInventories.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.inventories.set([]);
            return;
          }

          this.inventories.set(response.result ?? []);
          this.inventoryControl.enable({ emitEvent: false, });
        },

        error: error => {
          this.inventories.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los inventarios disponibles.';

          this.responseModalService.show('error', 'Error al consultar inventarios', message);
        },
      });
  }

  onInventorySelected(inventoryConfigurationId: number | null): void {
    this.products.set([]);
    this.productDrafts.set({});
    this.currentDraft = null;
    this.currentDraftKey = '';
    this.sectionControl.reset(null, { emitEvent: false, });
    this.sections.set([]);
    this.sectionControl.disable({ emitEvent: false, });

    const solutionCenterId = this.solutionCenterControl.value;

    if (!solutionCenterId || !inventoryConfigurationId) {
      return;
    }

    this.loadingSections.set(true);
    this.inventoryConfigurationService
      .getAvailableSections(
        solutionCenterId,
        inventoryConfigurationId
      )
      .pipe(
        finalize(() => {
          this.loadingSections.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.sections.set([]);
            return;
          }

          this.sections.set(response.result ?? []);
          this.sectionControl.enable({ emitEvent: false, });
        },

        error: error => {
          this.sections.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar las secciones disponibles.';

          this.responseModalService.show('error', 'Error al consultar secciones', message);
        },
      });
  }

  onSectionSelected(sectionId: number | null): void {
    this.products.set([]);
    this.productDrafts.set({});
    this.currentDraft = null;
    this.currentDraftKey = '';

    if (!sectionId) {
      return;
    }

    const solutionCenterId = this.solutionCenterControl.value;
    const inventoryConfigurationId = this.inventoryControl.value;

    if (!solutionCenterId || !inventoryConfigurationId) {
      return;
    }

    this.loadingProducts.set(true);
    this.inventoryConfigurationService
      .getAllSectionProducts(
        solutionCenterId,
        inventoryConfigurationId,
        sectionId
      )
      .pipe(
        finalize(() => {
          this.loadingProducts.set(false);
        })
      )
      .subscribe({
        next: products => {
          const orderedProducts = [...products].sort((a, b) => a.sortOrder - b.sortOrder);

          this.products.set(orderedProducts);
          this.initializeInventoryExecution(orderedProducts);
        },

        error: error => {
          this.products.set([]);
          this.productDrafts.set({});

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los productos de la sección.';

          this.responseModalService.show('error', 'Error al consultar productos', message);
        },
      });
  }

  private initializeDraft(products: InventorySectionProduct[], countNumber: InventoryCountNumber, inventoryExecutionId: string | null): void {
    const solutionCenterId = this.solutionCenterControl.value;
    const inventoryConfigurationId = this.inventoryControl.value;
    const sectionId = this.sectionControl.value;

    if (!solutionCenterId || !inventoryConfigurationId || !sectionId) {
      return;
    }

    const user = this.sessionService.getUser();

    if (!user) {
      return;
    }

    const userName =
      (
        user as {
          userLogin?: string;
          userName?: string;
          username?: string;
        }
      ).userLogin
      ??
      (
        user as {
          userName?: string;
        }
      ).userName
      ??
      (
        user as {
          username?: string;
        }
      ).username
      ??
      'usuario';

    this.currentDraftKey = this.inventoryDraftService.buildKey(userName, solutionCenterId, inventoryConfigurationId, sectionId, countNumber);

    let draft = this.inventoryDraftService.get(this.currentDraftKey);

    if (!draft) {
      const items: Record<number, InventoryProductDraft> = {};

      for (const product of products) {
        items[ product.productId ] = {
          countValue: null,
          open: null,
          closed: null,
          multiplicationValue: null,
        };
      }

      draft =
        this.inventoryDraftService.create(
          this.currentDraftKey,
          {
            inventoryExecutionId,
            solutionCenterId,
            inventoryConfigurationId,
            sectionId,
            countNumber,
            items,
          }
        );
    }

    for (const product of products) {
      if (!draft.items[ product.productId ]) {
        draft.items[ product.productId ] = {
          countValue: null,
          open: null,
          closed: null,
          multiplicationValue: null,
        };
      }
    }

    this.currentDraft = draft;
    this.productDrafts.set({ ...draft.items, });
  }

  getProductDraft(productId: number): InventoryProductDraft {
    return ( this.productDrafts()[ productId ] ?? {
        countValue: null,
        open: null,
        closed: null,
        multiplicationValue: null,
      }
    );
  }

  private parseNumber(event: Event): number | null {
    const input = event.target as HTMLInputElement;

    if (input.value === '') {
      return null;
    }

    const value = Number(input.value);

    return Number.isFinite(value) ? value : null;
  }

  private updateProductDraft(productId: number, changes: Partial<InventoryProductDraft>): void {

    if (!this.currentDraft || !this.currentDraftKey) {
      return;
    }

    const current = this.getProductDraft(productId);
    const updated: InventoryProductDraft = { ...current, ...changes, };
    const updatedItems = { ...this.productDrafts(), [productId]: updated, };

    this.productDrafts.set(updatedItems);
    this.currentDraft = { ...this.currentDraft, items: updatedItems, };

    const saved = this.inventoryDraftService.update(this.currentDraftKey, this.currentDraft);

    if (!saved) {
      this.currentDraft = null;
      this.currentDraftKey = '';
      this.responseModalService.show('warning', 'Conteo expirado', 'Han transcurrido las dos horas disponibles para este borrador.');
    }
  }

  onCountInput(product: InventorySectionProduct, event: Event): void {
    const countValue = this.parseNumber(event);
    const factor = product.f122Factor;
    const multiplicationValue = countValue !== null && factor !== null && factor !== undefined ? countValue * factor : null;

    this.updateProductDraft(
      product.productId,
      {
        countValue,
        multiplicationValue,
      }
    );
  }

  onOpenInput(product: InventorySectionProduct, event: Event): void {
    const open = this.parseNumber(event);
    const current = this.getProductDraft(product.productId);
    const closed = current.closed;
    const factor = product.f122Factor;
    const multiplicationValue = open !== null && closed !== null && factor !== null && factor !== undefined ? (open * factor) + closed : null;

    this.updateProductDraft(
      product.productId,
      {
        open,
        multiplicationValue,
      }
    );
  }

  onClosedInput(product: InventorySectionProduct, event: Event): void {
    const closed = this.parseNumber(event);
    const current = this.getProductDraft(product.productId);
    const open = current.open;
    const factor = product.f122Factor;
    const multiplicationValue = open !== null && closed !== null && factor !== null && factor !== undefined ? (open * factor) + closed : null;

    this.updateProductDraft(
      product.productId,
      {
        closed,
        multiplicationValue,
      }
    );
  }

  getPlanBackground(planId: string | null | undefined): string {
    switch (planId ?.trim().toUpperCase()) {
      case 'FAC':
        return '#e3f2fd';
      case 'FIF':
        return '#fff3e0';
      case 'ECL':
        return '#f3e5f5';
      default:
        return '#f5f0eb';
    }
  }

  getPlanColor(planId: string | null | undefined): string {
    switch (planId ?.trim().toUpperCase()) {
      case 'FAC':
        return '#1565c0';
      case 'FIF':
        return '#8a5a00';
      case 'ECL':
        return '#6a1b9a';
      default:
        return '#6b4a3a';
    }
  }

  finishSection(): void {

    if (this.savingInventory()) {
      return;
    }

    const solutionCenter = this.selectedSolutionCenter();
    const solutionCenterId = this.solutionCenterControl.value;
    const inventoryConfigurationId = this.inventoryControl.value;
    const sectionId = this.sectionControl.value;

    if (!solutionCenter || !solutionCenterId || !inventoryConfigurationId || !sectionId) {
      this.responseModalService.show('warning', 'Información incompleta', 'Debes seleccionar la bodega o punto de venta, el inventario y la sección.');
      return;
    }

    if (!this.currentDraft) {
      this.responseModalService.show('warning', 'Conteo no disponible', 'No existe un borrador de conteo para guardar.');
      return;
    }

    if (this.products().length === 0) {
      this.responseModalService.show('warning', 'Sin productos', 'La sección seleccionada no tiene productos para guardar.');
      return;
    }

    const isWarehouse = solutionCenter.solutionCenterTypeId === 1;

    for (const product of this.products()) {
      const draft = this.getProductDraft(product.productId);

      if (isWarehouse && draft.countValue === null) {
        this.responseModalService.show('warning', 'Conteo incompleto', `Debes ingresar el conteo del producto ${product.productName}.`);
        return;
      }

      if (!isWarehouse && (draft.open === null || draft.closed === null)) {
        this.responseModalService.show('warning', 'Conteo incompleto', `Debes ingresar los valores Abierto y Cerrado del producto ${product.productName}.`);
        return;
      }
    }

    const user = this.sessionService.getUser();

    if (!user) {
      this.responseModalService.show('error', 'Error de sesión', 'No fue posible obtener el usuario autenticado.');
      return;
    }

    const enteredBy =
      (
        user as {
          userLogin?: string;
          userName?: string;
          username?: string;
        }
      ).userLogin
      ??
      (
        user as {
          userName?: string;
        }
      ).userName
      ??
      (
        user as {
          username?: string;
        }
      ).username
      ??
      'usuario';

    const countNumber = this.activeCountNumber();

    if (!countNumber) {
      this.responseModalService.show('info', 'Inventario completado', 'Los tres conteos de esta sección ya fueron registrados.');
      return;
    }

    const request:
      InventoryCreate = {
        inventoryExecutionId: this.inventoryExecutionId(),
        solutionCenterId,
        inventoryConfigurationId,
        sectionId,
        countNumber,
        enteredBy,
        items:
          this.products().map(
            product => {              
              const draft = this.getProductDraft(product.productId);
              return {
                productId: product.productId,
                countValue: isWarehouse ? draft.countValue : null,
                open: isWarehouse ? null : draft.open,
                closed: isWarehouse ? null : draft.closed,
                multiplicationValue: draft.multiplicationValue ?? 0,
              };
            }
          ),
      };

    this.savingInventory.set(true);
    this.inventoryService
      .create(request)
      .pipe(
        finalize(() => {
          this.savingInventory.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo guardar', response.message || 'No fue posible guardar el inventario.');
            return;
          }

          const inventoryExecutionId = response.result ?.inventoryExecutionId;

          if (!inventoryExecutionId) {
            this.responseModalService.show('error', 'Error al guardar', 'El backend no devolvió el identificador de ejecución.');
            return;
          }

          this.inventoryExecutionId.set(inventoryExecutionId);

          if (this.currentDraft && this.currentDraftKey) {
            this.currentDraft = { ...this.currentDraft, inventoryExecutionId, };
            this.inventoryDraftService.update(this.currentDraftKey, this.currentDraft);
          }

          this.loadSavedCounts(inventoryExecutionId, this.products());
          this.responseModalService.show('success', 'Conteo guardado', response.message || `El Conteo ${countNumber} fue guardado correctamente.`);

          if (inventoryExecutionId && this.currentDraft && this.currentDraftKey) {
            this.currentDraft = { ...this.currentDraft, inventoryExecutionId, };
            this.inventoryDraftService.update(this.currentDraftKey, this.currentDraft);
          }

          this.responseModalService.show('success', 'Inventario guardado', response.message || 'Inventario guardado correctamente.');
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al guardar el inventario.';

          this.responseModalService.show('error', 'Error al guardar inventario', message);
        },
      });
  }

  getSavedCount(productId: number, countNumber: InventoryCountNumber): InventoryStoredCount | null {
    return (this.savedCounts()[productId] ?.[countNumber] ?? null);
  }

  isCountSaved(countNumber: InventoryCountNumber): boolean {
    return this.savedCountNumbers().includes(countNumber);
  }

  isActiveCount(countNumber: InventoryCountNumber): boolean {
    return (this.activeCountNumber() === countNumber);
  }

  get hasPendingCount(): boolean {
    return (this.activeCountNumber() !== null);
  }

  get allCountsCompleted(): boolean {
    return (this.savedCountNumbers().length >= 3);
  }

  private loadSavedCounts(inventoryExecutionId: string, products: InventorySectionProduct[]): void {
    this.loadingCounts.set(true);
    this.activeCountNumber.set(null);
    this.inventoryService
      .getCounts(inventoryExecutionId)
      .pipe(
        finalize(() => {
          this.loadingCounts.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('error', 'Error al consultar conteos', response.message || 'No se pudo consultar el estado de los conteos.');
            return;
          }

          const result = response.result;

          this.inventoryExecutionId.set(result.inventoryExecutionId);
          this.canViewFullDetail.set(result.canViewFullDetail === true);

          const savedNumbers = [...new Set((result.savedCountNumbers ?? []).filter((number): number is InventoryCountNumber => number === 1 || number === 2 || number === 3))].sort((a, b) => a - b);

          this.savedCountNumbers.set(savedNumbers);

          const mapped: Record<number, Partial<Record<InventoryCountNumber, InventoryStoredCount>>> = {};

          if (this.canViewFullDetail()) {
            for (const item of result.items ?? []) {
              mapped[item.productId] = {};

              for (const count of item.counts) {
                const number = count.countNumber as InventoryCountNumber;
                mapped[item.productId][number] = count;
              }
            }
          }

          this.savedCounts.set(mapped);

          const nextCount = this.countNumbers.find(number => !savedNumbers.includes(number)) ?? null;

          this.activeCountNumber.set(nextCount);

          if (nextCount !== null) {
            this.initializeDraft(products, nextCount, inventoryExecutionId);
          } else {
            this.currentDraft = null;
            this.currentDraftKey = '';
            this.productDrafts.set({});
          }
        },

        error: error => {
          this.activeCountNumber.set(null);
          this.currentDraft = null;
          this.currentDraftKey = '';

          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al consultar los conteos guardados.';

          this.responseModalService.show('error', 'Error al consultar conteos', message);
        }
      });
  }

  private initializeInventoryExecution(products: InventorySectionProduct[]): void {
    this.savedCounts.set({});
    this.savedCountNumbers.set([]);
    this.inventoryExecutionId.set(null);
    this.activeCountNumber.set(null);
    this.canViewFullDetail.set(false);
    this.productDrafts.set({});

    this.currentDraft = null;
    this.currentDraftKey = '';

    const solutionCenterId = this.solutionCenterControl.value;
    const inventoryConfigurationId = this.inventoryControl.value;
    const sectionId = this.sectionControl.value;

    if (!solutionCenterId || !inventoryConfigurationId || !sectionId) {
      return;
    }

    this.loadingCounts.set(true);
    this.inventoryService.getTodayExecution(
      solutionCenterId,
      inventoryConfigurationId,
      sectionId
    ).subscribe({
      next: response => {

        if (!response.isSuccess || !response.result) {
          this.loadingCounts.set(false);
          this.responseModalService.show('error', 'Error al consultar inventario', response.message || 'No fue posible consultar la ejecución del día.');
          return;
        }

        const executionId = response.result.inventoryExecutionId;

        if (executionId) {
          this.loadSavedCounts(executionId, products);
          return;
        }

        this.loadingCounts.set(false);
        this.activeCountNumber.set(1);
        this.initializeDraft(products, 1, null);
      },

      error: error => {
        this.loadingCounts.set(false);
        this.activeCountNumber.set(null);

        const message = error.status === 0
          ? 'No fue posible comunicarse con el servidor.'
          : error.error?.message || 'Ocurrió un error al consultar el inventario del día.';

        this.responseModalService.show('error', 'Error al consultar inventario', message);
      }
    });
  }

  getCalculatedFactor(product: InventorySectionProduct): number | null {
    return (this.getProductDraft(product.productId).multiplicationValue ?? null);
  }
}