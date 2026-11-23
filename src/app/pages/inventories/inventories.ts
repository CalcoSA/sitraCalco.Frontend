import { InventorySectionProduct, InventoryProductDraft, InventoryDraft, InventoryCreate, InventoryCountNumber, InventoryStoredCount, } from '../../models/inventory.model';
import { InventoryExcelExportService, InventoryExcelExportCount, InventoryExcelExportProduct, } from '../../services/inventory-excel-export.service';
import { InventoryAvailableOption, InventoryAvailableSectionOption, } from '../../models/inventory-configuration.model';
import { InventoryConfigurationService, } from '../../services/inventory-configuration.service';
import { OfflineInventoryService, } from '../../services/offline-inventory.service';
import { SolutionCenterService, } from '../../services/solution-center.service';
import { InventoryDraftService, } from '../../services/inventory-draft.service';
import { OfflineInventoryContext, } from '../../models/offline-inventory.model';
import { NetworkStatusService, } from '../../services/network-status.service';
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
  private readonly offlineInventoryService = inject(OfflineInventoryService);
  private readonly solutionCenterService = inject(SolutionCenterService);
  private readonly inventoryDraftService = inject(InventoryDraftService); 
  private readonly responseModalService = inject(ResponseModalService);
  private readonly networkStatusService = inject(NetworkStatusService);
  private readonly inventoryService = inject(InventoryService);
  private readonly sessionService = inject(SessionService);  
  private readonly formBuilder = inject(FormBuilder);
  
  // Excel temporal
  private readonly inventoryExcelExportService = inject(InventoryExcelExportService);

  readonly pendingCounts = signal<Record<number, Partial<Record<InventoryCountNumber, InventoryStoredCount>>>>({});
  readonly savedCounts = signal<Record<number, Partial<Record<InventoryCountNumber, InventoryStoredCount>>>>({});
  readonly productDrafts = signal<Record<number, InventoryProductDraft>>({});
  readonly selectedSolutionCenter = signal<SolutionCenter | null>(null);
  readonly activeCountNumber = signal<InventoryCountNumber | null>(1);
  readonly sections = signal<InventoryAvailableSectionOption[]>([]);
  readonly pendingCountNumbers = signal<InventoryCountNumber[]>([]);
  readonly offlineContexts = signal<OfflineInventoryContext[]>([]);
  readonly savedCountNumbers = signal<InventoryCountNumber[]>([]);  
  readonly inventories = signal<InventoryAvailableOption[]>([]);
  readonly inventoryExecutionId = signal<string | null>(null);  
  readonly products = signal<InventorySectionProduct[]>([]);
  readonly solutionCenters = signal<SolutionCenter[]>([]);
  
  // Excel temporal
  readonly exportingExcel = signal(false);

  readonly loadingSolutionCenters = signal(false);
  readonly loadingInventories = signal(false);
  readonly canViewFullDetail = signal(false);
  readonly preparingOffline = signal(false);
  readonly loadingSections = signal(false);
  readonly loadingProducts = signal(false);
  readonly savingInventory = signal(false);
  readonly offlinePrepared = signal(false);
  readonly loadingCounts = signal(false);  
  
  readonly inventoryControl = this.formBuilder.control<number | null>({ value: null, disabled: true, });
  readonly sectionControl = this.formBuilder.control<number | null>({ value: null, disabled: true, });
  readonly solutionCenterControl = this.formBuilder.control<number | null>(null);

  readonly isOnline = this.networkStatusService.isOnline;

  readonly countNumbers: InventoryCountNumber[] = [1, 2, 3,];
  
  private currentDraft: InventoryDraft | null = null;

  private currentDraftKey = '';

  ngOnInit(): void {

    if (this.isOnline()) {
      this.loadSolutionCenters();
      return;
    }

    void this.loadOfflineSolutionCenters();
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

  private async loadOfflineSolutionCenters(): Promise<void> {
    const userLogin = this.getCurrentUserLogin();

    if (!userLogin) {
      this.responseModalService.show('error', 'Sesión no disponible', 'No fue posible identificar el usuario para cargar los inventarios offline.');
      return;
    }

    this.loadingSolutionCenters.set(true);

    try {
      const contexts = await this.offlineInventoryService.getPreparedInventoriesForDate(userLogin, this.getCurrentDateKey());

      this.offlineContexts.set(contexts);

      if (contexts.length === 0) {
        this.solutionCenters.set([]);
        this.responseModalService.show('warning', 'Sin inventarios offline', 'No tienes inventarios preparados para trabajar sin conexión.');
        return;
      }

      const solutionCentersMap = new Map<number, SolutionCenter>();

      for (const context of contexts) {

        if (solutionCentersMap.has(context.solutionCenterId)) {
          continue;
        }

        solutionCentersMap.set(
          context.solutionCenterId,
          {
            solutionCenterId: context.solutionCenterId,
            solutionCenterTypeId: context.solutionCenterTypeId,
            solutionCenterTypeName: context.solutionCenterTypeId === 1 ? 'Bodega' : 'Punto de Venta',
            solutionCenterCode: context.solutionCenterCode,
            solutionCenterName: context.solutionCenterName,
            isActive: true,
          } as SolutionCenter
        );
      }

      this.solutionCenters.set(Array.from(solutionCentersMap.values()));

    } catch (error) {
      console.error('Error cargando inventarios offline:', error);

      this.solutionCenters.set([]);
      this.responseModalService.show('error', 'Error offline', 'No fue posible consultar los inventarios guardados en este dispositivo.');
    } finally {
      this.loadingSolutionCenters.set(false);
    }
  }

  private loadOfflineInventories(solutionCenterId: number): void {
    const contexts =
      this.offlineContexts()
        .filter(
          context =>
            context.solutionCenterId === solutionCenterId
        );

    const inventoriesMap = new Map<number, InventoryAvailableOption>();

    for (const context of contexts) {

      if (inventoriesMap.has(context.inventoryConfigurationId)) {
        continue;
      }

      inventoriesMap.set(
        context.inventoryConfigurationId,
        {
          inventoryConfigurationId: context.inventoryConfigurationId,
          inventoryConfigurationName: context.inventoryConfigurationName,
        }
      );
    }

    const inventories = Array.from(inventoriesMap.values());

    this.inventories.set(inventories);

    if (inventories.length > 0) {
      this.inventoryControl.enable({ emitEvent: false, });
    } else {
      this.inventoryControl.disable({ emitEvent: false, });
    }
  }

  private loadOfflineSections(solutionCenterId: number, inventoryConfigurationId: number): void {
    const contexts =
      this.offlineContexts()
        .filter(
          context =>
            context.solutionCenterId === solutionCenterId && context.inventoryConfigurationId === inventoryConfigurationId
        );

    const sectionsMap = new Map<number, InventoryAvailableSectionOption>();

    for (const context of contexts) {

      if (sectionsMap.has(context.sectionId)) {
        continue;
      }

      sectionsMap.set(
        context.sectionId,
        {
          sectionId: context.sectionId,
          sectionName: context.sectionName,
        }
      );
    }

    const sections = Array.from(sectionsMap.values());

    this.sections.set(sections);

    if (sections.length > 0) {
      this.sectionControl.enable({ emitEvent: false, });
    } else {
      this.sectionControl.disable({ emitEvent: false, });
    }
  }

  private loadOfflineSection(solutionCenterId: number, inventoryConfigurationId: number, sectionId: number): void {
    const context =
      this.offlineContexts()
        .find(
          item =>
            item.solutionCenterId === solutionCenterId && item.inventoryConfigurationId === inventoryConfigurationId && item.sectionId === sectionId
        );

    if (!context) {
      this.products.set([]);
      this.responseModalService.show('warning', 'Inventario no disponible', 'Esta sección no fue preparada para trabajar sin conexión.');
      return;
    }

    const products = structuredClone(context.products ?? []).sort((a, b) => a.sortOrder - b.sortOrder);

    this.products.set(products);
    this.inventoryExecutionId.set(context.inventoryExecutionId);

    const savedNumbers =
      [
        ...context.savedCountNumbers,
      ]
        .filter(
          (number): number is InventoryCountNumber =>
              number === 1 ||
              number === 2 ||
              number === 3
        ).sort((a, b) => a - b);

    this.savedCountNumbers.set(savedNumbers);
    this.savedCounts.set(structuredClone(context.savedCounts ?? {}));

    const pendingNumbers =
      [
        ...new Set(context.pendingCountNumbers ?? []),
      ]
        .filter(
          (number): number is InventoryCountNumber =>
            number === 1 ||
            number === 2 ||
            number === 3
        ).sort((a, b) => a - b);

    this.pendingCountNumbers.set(pendingNumbers);
    this.pendingCounts.set(structuredClone(context.pendingCounts ?? {}));
    this.canViewFullDetail.set(context.canViewFullDetail === true);

    const completedOrPending = new Set<InventoryCountNumber>([...savedNumbers, ...pendingNumbers,]);
    const nextCount = this.countNumbers.find(number => !completedOrPending.has(number)) ?? null;

    this.activeCountNumber.set(nextCount);
    this.offlinePrepared.set(true);

    if (nextCount !== null) {
      this.initializeDraft(products, nextCount, context.inventoryExecutionId);
    } else {
      this.currentDraft = null;
      this.currentDraftKey = '';
      this.productDrafts.set({});
    }
  }

  onSolutionCenterSelected(solutionCenterId: number | null): void {
    this.offlinePrepared.set(false);
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

    if (!this.isOnline()) {
      this.loadOfflineInventories(solutionCenterId);
      return;
    }

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
    this.offlinePrepared.set(false);
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

    if (!this.isOnline()) {
      this.loadOfflineSections(solutionCenterId, inventoryConfigurationId);
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
    this.offlinePrepared.set(false);
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

    if (!this.isOnline()) {
      this.loadOfflineSection(solutionCenterId, inventoryConfigurationId, sectionId);
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
          void this.refreshOfflinePreparedStatus();
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
    const multiplicationValue = countValue !== null && factor !== null && factor !== undefined ? this.roundToFourDecimals(countValue * factor) : null;

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
    const multiplicationValue = this.calculateMultiplicationValue(product, open, current.closed);

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
    const multiplicationValue = this.calculateMultiplicationValue(product, current.open, closed);

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

  private getCurrentUserLogin(): string | null {
    const user = this.sessionService.getUser();

    if (!user) {
      return null;
    }

    return (
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
      null
    );
  }

  private getCurrentDateKey(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getCurrentOfflineContextKey(): string | null {
    const userLogin = this.getCurrentUserLogin();

    const solutionCenterId = this.solutionCenterControl.value;
    const inventoryConfigurationId = this.inventoryControl.value;
    const sectionId = this.sectionControl.value;

    if (!userLogin || !solutionCenterId || !inventoryConfigurationId || !sectionId) {
      return null;
    }

    return this.offlineInventoryService
      .buildContextKey(
        userLogin,
        this.getCurrentDateKey(),
        solutionCenterId,
        inventoryConfigurationId,
        sectionId
      );
  }

  private async refreshOfflinePreparedStatus(): Promise<void> {
    const contextKey = this.getCurrentOfflineContextKey();

    if (!contextKey) {
      this.offlinePrepared.set(false);
      return;
    }

    try {
      const context = await this.offlineInventoryService.getPreparedInventory(contextKey);

      this.offlinePrepared.set(context !== null);

    } catch {
      this.offlinePrepared.set(false);
    }
  }

  async prepareForOffline(): Promise<void> {

    if (this.preparingOffline()) {
      return;
    }

    if (!this.isOnline()) {
      this.responseModalService.show('warning', 'Sin conexión', 'Debes tener conexión a internet para preparar o actualizar el inventario offline.');
      return;
    }

    const userLogin = this.getCurrentUserLogin();
    const solutionCenter = this.selectedSolutionCenter();

    const inventoryConfigurationId = this.inventoryControl.value;
    const sectionId = this.sectionControl.value;

    if (!userLogin || !solutionCenter || !inventoryConfigurationId || !sectionId) {
      this.responseModalService.show('warning', 'Información incompleta', 'Debes seleccionar la bodega o punto de venta, el inventario y la sección.');
      return;
    }

    if (this.products().length === 0) {
      this.responseModalService.show('warning', 'Sin productos', 'La sección seleccionada no tiene productos para preparar.');
      return;
    }

    const inventory = this.inventories().find(item => item.inventoryConfigurationId === inventoryConfigurationId);
    const section = this.sections().find(item => item.sectionId === sectionId);

    if (!inventory || !section) {
      this.responseModalService.show('error', 'Error al preparar', 'No fue posible obtener la información del inventario o de la sección.');
      return;
    }

    const inventoryDate = this.getCurrentDateKey();

    const contextKey =
      this.offlineInventoryService
        .buildContextKey(
          userLogin,
          inventoryDate,
          solutionCenter.solutionCenterId,
          inventoryConfigurationId,
          sectionId
        );

    this.preparingOffline.set(true);

    try {
      await this.offlineInventoryService
        .prepare(
          {
            contextKey,
            userLogin,
            inventoryDate,
            solutionCenterId: solutionCenter.solutionCenterId,
            solutionCenterTypeId: solutionCenter.solutionCenterTypeId,
            solutionCenterCode: solutionCenter.solutionCenterCode,
            solutionCenterName: solutionCenter.solutionCenterName,
            inventoryConfigurationId,
            inventoryConfigurationName: inventory.inventoryConfigurationName,
            sectionId,
            sectionName: section.sectionName,
            products: structuredClone(this.products()),
            inventoryExecutionId: this.inventoryExecutionId(),
            savedCountNumbers: [ ...this.savedCountNumbers(), ],
            savedCounts: structuredClone(this.savedCounts()),
            canViewFullDetail: this.canViewFullDetail(),
            preparedAt: Date.now(),
          }
        );

      this.offlinePrepared.set(true);
      this.responseModalService.show('success', 'Inventario preparado', 'Esta sección quedó disponible para trabajar sin conexión.');

    } catch (error) {
      console.error('Error preparando inventario offline:', error);
      this.responseModalService.show('error', 'Error al preparar', 'No fue posible guardar localmente la información del inventario.');
    } finally {
      this.preparingOffline.set(false);
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
                siesaStock: product.siesaStockStatus === 'FOUND' ? product.existencia1 ?? null : null,
              };
            }
          ),
      };

    if (!this.isOnline()) {      
      void this.finishSectionOffline(request, countNumber);
      return;
    }

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

  private async finishSectionOffline(request: InventoryCreate, countNumber: InventoryCountNumber): Promise<void> {
    const contextKey = this.getCurrentOfflineContextKey();

    if (!contextKey) {
      this.responseModalService.show('error', 'Inventario offline no disponible', 'No fue posible identificar el inventario preparado en este dispositivo.');
      return;
    }

    this.savingInventory.set(true);

    try {
      await this.offlineInventoryService.queueCount(contextKey, request);

      const context = await this.offlineInventoryService.getPreparedInventory(contextKey);

      if (!context) {
        throw new Error('No fue posible recuperar el inventario offline.');
      }

      this.offlineContexts.set(this.offlineContexts().map(current => current.contextKey === context.contextKey ? context : current));

      const pendingNumbers =
        [
          ...new Set(context.pendingCountNumbers ?? []),
        ]
          .filter(
            (number): number is InventoryCountNumber =>
              number === 1 ||
              number === 2 ||
              number === 3
          ).sort((a, b) => a - b);

      this.pendingCountNumbers.set(pendingNumbers);
      this.pendingCounts.set(structuredClone(context.pendingCounts ?? {} ));

      const unavailableCounts =
        new Set<InventoryCountNumber>([
          ...this.savedCountNumbers(),
          ...pendingNumbers,
        ]);

      const nextCount = this.countNumbers.find(number => !unavailableCounts.has(number)) ?? null;

      this.currentDraft = null;
      this.currentDraftKey = '';

      this.productDrafts.set({});
      this.activeCountNumber.set(nextCount);

      if (nextCount !== null) {
        this.initializeDraft(this.products(), nextCount, context.inventoryExecutionId);
      }

      this.responseModalService.show('success', 'Conteo guardado en el dispositivo', `El Conteo ${countNumber} quedó pendiente de sincronización y se enviará cuando vuelva la conexión.`);
    } catch (error) {
      console.error('Error guardando conteo offline:', error);      
      this.responseModalService.show('error', 'Error al guardar offline', 'No fue posible almacenar el conteo en este dispositivo.');
    } finally {
      this.savingInventory.set(false);
    }
  }

  getSavedCount(productId: number, countNumber: InventoryCountNumber): InventoryStoredCount | null {
    return (this.savedCounts()[productId] ?.[countNumber] ?? null);
  }
  /*
  getPendingCount(productId: number, countNumber: InventoryCountNumber): InventoryStoredCount | null {
    return (this.pendingCounts()[productId]?.[countNumber] ?? null);
  } */

  // Excel temporal - Descmentar el anterior
  getPendingCount(productId: number, countNumber: InventoryCountNumber): InventoryStoredCount | null {
    return (this.pendingCounts()[productId]?.[countNumber] ?? null);
  }

  isCountPending(countNumber: InventoryCountNumber): boolean {
    return this.pendingCountNumbers().includes(countNumber);
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

  private getPackageQuantity(unitOfMeasure: string | null | undefined): number | null {
    if (!unitOfMeasure) {
      return null;
    }

    const normalized = unitOfMeasure.trim().replace(',', '.');
    const match = normalized.match(/^x\s*(\d+(?:\.\d+)?)/i);

    if (!match) {
      return null;
    }

    const quantity = Number(match[1]);

    return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
  }

  private calculateMultiplicationValue(product: InventorySectionProduct, open: number | null, closed: number | null): number | null {

    if (open === null || closed === null) {
      return null;
    }

    const factor = product.f122Factor;

    if (factor === null || factor === undefined) {
      return null;
    }

    let result: number;

    if (factor === 1) {
      const packageQuantity = this.getPackageQuantity(product.unitOfMeasure);

      if (packageQuantity !== null) {
        result = closed + (open / packageQuantity);
      } else {
        result = (closed * factor) + open;
      }
    } else {
      result = (closed * factor) + open;
    }

    return this.roundToFourDecimals(result);
  }

  private roundToFourDecimals(value: number | null): number | null {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }

    return Number(value.toFixed(4));
  }

  // Excel temporal
  private getExportCount(productId: number, countNumber: InventoryCountNumber): InventoryExcelExportCount | null {
    const savedCount = this.getSavedCount(productId, countNumber);

    if (savedCount) {
      return {
        countNumber,
        status: 'GUARDADO',
        value: savedCount.value,
        open: savedCount.open,
        closed: savedCount.closed,
        multiplicationValue:
          savedCount.multiplicationValue,
      };
    }

    const pendingCount = this.getPendingCount(productId, countNumber);

    if (pendingCount) {
      return {
        countNumber,
        status: 'POR SINCRONIZAR',
        value: pendingCount.value,
        open: pendingCount.open,
        closed: pendingCount.closed,
        multiplicationValue:
          pendingCount.multiplicationValue,
      };
    }

    return null;
  }

  // Excel temporal
  private getExportableCountNumbers():
    InventoryCountNumber[] {
    return this.countNumbers.filter(countNumber => this.products().some(product => this.getExportCount(product.productId, countNumber) !== null));
  }

  // Excel temporal
  get canExportInventory(): boolean {
    if (this.products().length === 0 || this.loadingProducts() || this.loadingCounts() || this.exportingExcel()) {
      return false;
    }

    return (this.getExportableCountNumbers().length > 0);
  }

  // Excel temporal
  async exportInventoryExcel(): Promise<void> {
    if (this.exportingExcel()) {
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

    const inventory = this.inventories().find(item => item.inventoryConfigurationId === inventoryConfigurationId);
    const section = this.sections().find(item => item.sectionId === sectionId);

    if (!inventory || !section) {
      this.responseModalService.show('warning', 'Información incompleta', 'No fue posible obtener la información del inventario o de la sección.');
      return;
    }

    const countNumbers = this.getExportableCountNumbers();

    if (countNumbers.length === 0) {
      this.responseModalService.show('info', 'Sin información para exportar', 'Debes finalizar al menos un conteo antes de exportar el inventario.');
      return;
    }

    const products:
      InventoryExcelExportProduct[] =
      this.products().map(
        product => {
          const counts: Partial<Record<InventoryCountNumber, InventoryExcelExportCount>> = {};

          for ( const countNumber of countNumbers) {
            const count = this.getExportCount(product.productId, countNumber);

            if (count) {
              counts[countNumber] = count;
            }
          }

          return {
            reference: product.reference,
            productName: product.productName,
            unitOfMeasure: product.unitOfMeasure,
            counts,
          };
        }
      );

    this.exportingExcel.set(true);

    try {

      await this.inventoryExcelExportService
        .exportInventory({
          solutionCenterCode: solutionCenter.solutionCenterCode,
          solutionCenterName: solutionCenter.solutionCenterName,
          solutionCenterTypeId: solutionCenter.solutionCenterTypeId,
          solutionCenterTypeName: solutionCenter.solutionCenterTypeName,
          inventoryConfigurationName: inventory.inventoryConfigurationName,
          sectionName: section.sectionName,
          inventoryExecutionId: this.inventoryExecutionId(),
          countNumbers,
          products,
        });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error al generar el archivo de Excel.';
      this.responseModalService.show('error', 'Error al exportar', message);
    } finally {
      this.exportingExcel.set(false);
    }
  }

  get canViewExportInventory(): boolean {
    const role = this.sessionService.getUser()?.nameRole;

    if (!role) {
      return false;
    }

    const normalizedRole = role
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    return normalizedRole !== 'PDV' && normalizedRole !== 'AUXILIAR ALMACEN';
  }
}