import { InventoryConfigurationOption, SolutionCenterInventoryConfigurations, InventoryConfigurationListItem, InventoryConfigurationSolutionCenter, InventoryConfigurationDetail, InventoryConfigurationSectionDetail } from '../../models/inventory-configuration.model';
import { InventoryConfigurationService } from '../../services/inventory-configuration.service';
import { Component, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ResponseModalService } from '../../services/response-modal.service';
import { switchMap, finalize, forkJoin, of, throwError, } from 'rxjs';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-inventory-configuration',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatTableModule,    
    MatTabsModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './inventory-configuration.html',
})

export class InventoryConfiguration implements OnInit {

  @ViewChild('createInventoryModal', { static: true })
  private createInventoryModal!: TemplateRef<unknown>;

  @ViewChild('assignInventoryModal', { static: true })
  private assignInventoryModal!: TemplateRef<unknown>;

  @ViewChild('viewInventoryConfigurationModal', { static: true })
  private viewInventoryConfigurationModal!: TemplateRef<unknown>;

  private readonly inventoryConfigurationService = inject(InventoryConfigurationService);
  private readonly responseModalService = inject(ResponseModalService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);

  readonly solutionCenterConfigurations = signal<SolutionCenterInventoryConfigurations | null>(null);
  readonly assignmentSolutionCenter = signal<InventoryConfigurationSolutionCenter | null>(null);
  readonly selectedInventoryConfiguration = signal<InventoryConfigurationDetail | null>(null);
  readonly selectedSectionDetail = signal<InventoryConfigurationSectionDetail | null>(null);
  readonly availableInventories = signal<InventoryConfigurationListItem[]>([]);
  readonly sectionInventories = signal<InventoryConfigurationListItem[]>([]);
  readonly editingAssignmentConfigurationId = signal<number | null>(null); 
  readonly allInventories = signal<InventoryConfigurationListItem[]>([]);
  readonly deletingConfigurationId = signal<number | null>(null);
  readonly options = signal<InventoryConfigurationOption[]>([]);
  readonly editingInventoryId = signal<number | null>(null);

  readonly loadingAvailableInventories = signal(false);
  readonly loadingAssignmentSections = signal(false);
  readonly assigningSectionInventory = signal(false);
  readonly loadingSectionAssignment = signal(false);
  readonly loadingConfigurations = signal(false);
  readonly assigningInventory = signal(false);
  readonly loadingInventories = signal(false);
  readonly creatingInventory = signal(false);
  readonly loadingOptions = signal(false);  
  readonly inventoryTake = signal(10);
  readonly inventoryTotal = signal(0);
  readonly inventoryPages = signal(0);
  readonly inventoryPage = signal(1);
  readonly selectedType = signal(1);  

  readonly sectionSolutionCenterControl = this.formBuilder.nonNullable.control<number[]>([]);
  readonly sectionAssignmentControl = this.formBuilder.nonNullable.control<number[]>([]);
  readonly inventoryAssignmentControl = this.formBuilder.control<number | null>(null);
  readonly sectionInventoryControl = this.formBuilder.control<number | null>(null);
  readonly optionControl = this.formBuilder.control<number | null>(null);  

  private viewInventoryConfigurationDialogRef: MatDialogRef<unknown> | null = null;
  private createInventoryDialogRef: MatDialogRef<unknown> | null = null;
  private assignInventoryDialogRef: MatDialogRef<unknown> | null = null;
  private originalAssignmentSectionIds: number[] = [];
  private originalInventoryDays: string[] = [];

  inventoryValidationError = '';

  readonly daysOfMonth: number[] = Array.from({ length: 31, }, (_, index) => index + 1);

  readonly displayedColumns: string[] = [
    'inventoryConfigurationName',
    'actions',
  ];

  readonly daysOfWeek = [
    {
      value: 'Lunes',
      label: 'Lunes',
    },
    {
      value: 'Martes',
      label: 'Martes',
    },
    {
      value: 'Miercoles',
      label: 'Miércoles',
    },
    {
      value: 'Jueves',
      label: 'Jueves',
    },
    {
      value: 'Viernes',
      label: 'Viernes',
    },
    {
      value: 'Sabado',
      label: 'Sábado',
    },
    {
      value: 'Domingo',
      label: 'Domingo',
    },
  ];

  readonly inventoryModalColumns: string[] = [
    'inventoryConfigurationName',
    'startDay',
    'endDay',
    'daysOfWeek',
    'actions',
  ];

  readonly inventoryForm =
    this.formBuilder.group({
      inventoryConfigurationName: this.formBuilder.nonNullable.control(''),
      startDay: this.formBuilder.control<number | null>(null),
      endDay: this.formBuilder.control<number | null>(null),
      days: this.formBuilder.nonNullable.control<string[]>([]),
    });

  ngOnInit(): void {
    this.loadOptions(1);

    this.inventoryForm.controls.days.valueChanges
      .subscribe(days => {

        if (days.length > 0) {
          this.inventoryForm.controls.startDay.disable({ emitEvent: false, });
          this.inventoryForm.controls.endDay.disable({ emitEvent: false, });
          return;
        }

        this.inventoryForm.controls.startDay.enable({ emitEvent: false, });
        this.inventoryForm.controls.endDay.enable({ emitEvent: false, });
      });


    this.inventoryForm.controls.startDay.valueChanges
      .subscribe(() => {
        this.updateDaysState();
      });


    this.inventoryForm.controls.endDay.valueChanges
      .subscribe(() => {
        this.updateDaysState();
      });
  }

  private loadAvailableInventories(): void {
    this.loadingAvailableInventories.set(true);
    this.availableInventories.set([]);
    this.inventoryConfigurationService
      .getAllForAssignment()
      .pipe(
        finalize(() => {
          this.loadingAvailableInventories.set(false);
        })
      )
      .subscribe({
        next: inventories => {
          this.availableInventories.set(inventories);
        },
        error: error => {
          this.availableInventories.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los inventarios.';

          this.responseModalService.show('error', 'Error al consultar inventarios', message);
        },
      });
  }

  private updateDaysState(): void {
    const startDay = this.inventoryForm.controls.startDay.value;
    const endDay = this.inventoryForm.controls.endDay.value;
    const hasDaysOfMonth = startDay !== null || endDay !== null;

    if (hasDaysOfMonth) {
      this.inventoryForm.controls.days.disable({ emitEvent: false, });
      return;
    }

    this.inventoryForm.controls.days.enable({ emitEvent: false, });
  }

  changeTab(index: number): void {
    const type = index + 1;

    this.selectedType.set(type);
    this.optionControl.setValue(null);
    this.options.set([]);
    this.solutionCenterConfigurations.set(null);
    this.selectedSectionDetail.set(null);
    this.sectionInventories.set([]);
    this.sectionInventoryControl.setValue(null);
    this.sectionSolutionCenterControl.setValue([]);
    this.loadOptions(type);
  }

  loadOptions(type: number): void {
    this.loadingOptions.set(true);
    this.inventoryConfigurationService
      .getOptions(type)
      .pipe(
        finalize(() => {
          this.loadingOptions.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.options.set([]);
            return;
          }

          this.options.set((response.result ?? []).filter(option => option.isActive));
        },

        error: (error) => {
          this.options.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar las opciones de configuración.';

          this.responseModalService.show('error', 'Error al consultar opciones', message);
        },
      });
  }

  onOptionSelected(solutionCenterId: number | null): void {
    this.solutionCenterConfigurations.set(null);

    if (!solutionCenterId) {
      return;
    }

    const type = this.selectedType();

    if (type !== 1 && type !== 2) {
      return;
    }

    this.loadSolutionCenterConfigurations(solutionCenterId);
  }

  onSectionSelected(sectionId: number | null): void {
    this.selectedSectionDetail.set(null);
    this.sectionInventories.set([]);
    this.sectionInventoryControl.setValue(null);
    this.sectionSolutionCenterControl.setValue([]);

    if (!sectionId) {
      return;
    }

    this.loadSectionAssignmentData(sectionId);
  }

  private loadSectionAssignmentData(sectionId: number): void {
    this.loadingSectionAssignment.set(true);
    forkJoin({
      section: this.inventoryConfigurationService.getSection(sectionId),
      inventories: this.inventoryConfigurationService.getAllForAssignment(),
    })
      .pipe(
        finalize(() => {
          this.loadingSectionAssignment.set(false);
        })
      )
      .subscribe({
        next: result => {

          if (!result.section.isSuccess || !result.section.result) {
            this.selectedSectionDetail.set(null);
            this.sectionInventories.set([]);
            this.responseModalService.show('error', 'Error al consultar sección', result.section.message || 'No fue posible consultar la información de la sección.');
            return;
          }

          this.selectedSectionDetail.set(result.section.result);
          this.sectionInventories.set(result.inventories);
        },

        error: error => {
          this.selectedSectionDetail.set(null);
          this.sectionInventories.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar la información de la sección.';

          this.responseModalService.show('error', 'Error al consultar sección', message);
        },
      });
  }

  assignInventoryBySection(): void {
    const section = this.selectedSectionDetail();
    const inventoryConfigurationId = this.sectionInventoryControl.value;
    const solutionCenterIds = this.sectionSolutionCenterControl.value;

    if (!section) {
      this.responseModalService.show('warning', 'Sección requerida', 'Debes seleccionar una sección.');
      return;
    }

    if (!inventoryConfigurationId) {
      this.responseModalService.show('warning', 'Inventario requerido', 'Debes seleccionar un inventario.');
      return;
    }

    if (solutionCenterIds.length === 0) {
      this.responseModalService.show('warning', 'Punto de venta requerido', 'Debes seleccionar al menos un punto de venta.');
      return;
    }

    const assignments =
      solutionCenterIds.map(
        solutionCenterId => ({
          solutionCenterId,
          sectionId: section.sectionId,
        })
      );

    this.assigningSectionInventory.set(true);
    this.inventoryConfigurationService
      .assignInventory(
        inventoryConfigurationId,
        {
          assignments,
        }
      )
      .pipe(
        finalize(() => {
          this.assigningSectionInventory.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo asignar', response.message || 'No fue posible realizar las asignaciones.');
            return;
          }

          this.sectionInventoryControl.setValue(null);
          this.sectionSolutionCenterControl.setValue([]);
          this.responseModalService.show('success', 'Inventario asignado', response.message || 'El inventario fue asignado correctamente.');
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al asignar el inventario.';

          this.responseModalService.show('error', 'Error al asignar inventario', message);
        },
      });
  }

  private loadSolutionCenterConfigurations(solutionCenterId: number): void {
    this.loadingConfigurations.set(true);
    this.inventoryConfigurationService
      .getSolutionCenterConfigurations(solutionCenterId)
      .pipe(
        finalize(() => {
          this.loadingConfigurations.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.solutionCenterConfigurations.set(null);
            this.responseModalService.show('error', 'Error al consultar configuraciones', response.message || 'No fue posible consultar las configuraciones de inventario.');
            return;
          }

          this.solutionCenterConfigurations.set(response.result);
        },

        error: (error) => {
          this.solutionCenterConfigurations.set(null);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar las configuraciones de inventario.';

          this.responseModalService.show('error', 'Error al consultar configuraciones', message);
        },
      });
  }

  onInventoryNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upperValue = input.value.toUpperCase();
    input.value = upperValue;
    this.inventoryForm.controls.inventoryConfigurationName.setValue(upperValue, { emitEvent: false, });
  }

  openCreateInventoryModal(): void {
    this.inventoryValidationError = '';
    this.resetInventoryForm();
    this.inventoryPage.set(1);
    this.loadInventories(1, this.inventoryTake());
    this.createInventoryDialogRef =
      this.dialog.open(
        this.createInventoryModal,
        {
          width: '900px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          disableClose: true,
          autoFocus: false,
        }
      );
  }

  closeCreateInventoryModal(): void {

    if (this.creatingInventory()) {
      return;
    }

    this.createInventoryDialogRef?.close();
    this.createInventoryDialogRef = null;
    this.inventoryValidationError = '';
  }

  saveInventory(): void {

    if (this.editingInventoryId() !== null) {
      this.updateInventory();
      return;
    }

    this.createInventory();
  }

  createInventory(): void {
    this.inventoryValidationError = '';

    const inventoryConfigurationName = this.inventoryForm.controls.inventoryConfigurationName.value.trim();
    const startDay = this.inventoryForm.controls.startDay.value;
    const endDay = this.inventoryForm.controls.endDay.value;
    const days = this.inventoryForm.controls.days.value;

    if (!inventoryConfigurationName) {
      this.inventoryValidationError = 'Debes ingresar el nombre del inventario.';
      return;
    }

    const usesDaysOfWeek = days.length > 0;

    if (!usesDaysOfWeek && startDay === null) {
      this.inventoryValidationError = 'Debes seleccionar el día desde o seleccionar uno o varios días de la semana.';
      return;
    }

    if (startDay !== null && endDay !== null && startDay > endDay) {
      this.inventoryValidationError = 'El día desde no puede ser mayor que el día hasta.';
      return;
    }

    this.creatingInventory.set(true);
    this.inventoryConfigurationService
      .create({
        inventoryConfigurationName,
        startDay: usesDaysOfWeek ? null : startDay,
        endDay: usesDaysOfWeek ? null : endDay,
      })
      .pipe(
        switchMap(response => {

          if (!response.isSuccess || !response.result?.inventoryConfigurationId) {
            this.responseModalService.show('error', 'No se pudo crear', response.message || 'No fue posible crear la configuración de inventario.');
            return of(null);
          }

          const inventoryConfigurationId = response.result.inventoryConfigurationId;

          if (!usesDaysOfWeek) {
            return of({ inventoryConfigurationId, message: response.message, });
          }

          return this.inventoryConfigurationService.addDays(inventoryConfigurationId, { days, });
        }),

        finalize(() => {
          this.creatingInventory.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response) {
            return;
          }

          if ('isSuccess' in response && !response.isSuccess) {
            this.responseModalService.show('error', 'Inventario creado parcialmente', response.message || 'El inventario fue creado, pero no fue posible guardar los días.');
            return;
          }

          this.resetInventoryForm();
          this.inventoryValidationError = '';
          this.loadInventories(this.inventoryPage(), this.inventoryTake());
          this.responseModalService.show('success', 'Inventario creado', 'Configuración de inventario creada correctamente.');
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al crear la configuración de inventario.';

          this.responseModalService.show('error', 'Error al crear inventario', message);
        },
      });
  }

  private resetInventoryForm(): void {
    this.editingInventoryId.set(null);
    this.originalInventoryDays = [];
    this.inventoryForm.controls.startDay.enable({ emitEvent: false, });
    this.inventoryForm.controls.endDay.enable({ emitEvent: false, });
    this.inventoryForm.controls.days.enable({ emitEvent: false, });
    this.inventoryForm.reset(
      {
        inventoryConfigurationName: '',
        startDay: null,
        endDay: null,
        days: [],
      },
      { emitEvent: false, }
    );
  }

  loadInventories(page = this.inventoryPage(), take = this.inventoryTake()): void {
    this.loadingInventories.set(true);
    this.inventoryConfigurationService
      .getAll(page, take)
      .pipe(
        finalize(() => {
          this.loadingInventories.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess || !response.result) {
            this.allInventories.set([]);
            this.inventoryTotal.set(0);
            this.inventoryPages.set(0);
            return;
          }

          this.allInventories.set(response.result.items ?? []);
          this.inventoryPage.set(response.result.page);
          this.inventoryTake.set(response.result.take);
          this.inventoryTotal.set(response.result.total);
          this.inventoryPages.set(response.result.pages);
        },

        error: error => {
          this.allInventories.set([]);
          this.inventoryTotal.set(0);
          this.inventoryPages.set(0);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los inventarios.';

          this.responseModalService.show('error', 'Error al consultar inventarios', message);
        },
      });
  }

  previousInventoryPage(): void {
    if (this.inventoryPage() <= 1 || this.loadingInventories()) {
      return;
    }

    this.loadInventories(this.inventoryPage() - 1, this.inventoryTake());
  }

  nextInventoryPage(): void {
    if (this.inventoryPage() >= this.inventoryPages() || this.loadingInventories()) {
      return;
    }

    this.loadInventories(this.inventoryPage() + 1, this.inventoryTake());
  }

  changeInventoryPageSize(take: number): void {
    this.inventoryTake.set(take);
    this.inventoryPage.set(1);
    this.loadInventories(1, take);
  }

  get inventoryFirstItem(): number {
    if (this.inventoryTotal() === 0) {
      return 0;
    }

    return ((this.inventoryPage() - 1) * this.inventoryTake()) + 1;
  }

  get inventoryLastItem(): number {
    return Math.min(
      this.inventoryPage() *
      this.inventoryTake(),
      this.inventoryTotal()
    );
  }

  getInventoryDays(inventory: InventoryConfigurationListItem): string {
    if (!inventory.daysOfWeek || inventory.daysOfWeek.length === 0) {
      return '—';
    }

    return inventory.daysOfWeek.map(day => day.dayOfWeek).join(', ');
  }

  openAssignInventoryModal(): void {
    const solutionCenterId = this.optionControl.value;

    if (!solutionCenterId) {
      this.responseModalService.show('warning', 'Centro no seleccionado', 'Debes seleccionar una bodega o punto de venta.');
      return;
    }

    this.editingAssignmentConfigurationId.set(null);
    this.originalAssignmentSectionIds = [];
    this.inventoryAssignmentControl.setValue(null);
    this.sectionAssignmentControl.setValue([]);
    this.assignmentSolutionCenter.set(null);
    this.loadAvailableInventories();
    this.loadAssignmentSolutionCenter(solutionCenterId);

    this.assignInventoryDialogRef =
      this.dialog.open(
        this.assignInventoryModal,
        {
          width: '720px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          disableClose: true,
          autoFocus: false,
        }
      );
  }

  closeAssignInventoryModal(): void {
    this.assignInventoryDialogRef?.close();
    this.assignInventoryDialogRef = null;
    this.inventoryAssignmentControl.setValue(null);
    this.sectionAssignmentControl.setValue([]);
    this.assignmentSolutionCenter.set(null);
    this.editingAssignmentConfigurationId.set(null);
    this.originalAssignmentSectionIds = [];
    this.availableInventories.set([]);
  }

  editInventory(inventory: InventoryConfigurationListItem): void {
    this.inventoryValidationError = '';
    this.editingInventoryId.set(inventory.inventoryConfigurationId);

    const days = inventory.daysOfWeek.map(item => item.dayOfWeek);

    this.originalInventoryDays = [...days];
    this.inventoryForm.controls.startDay.enable({ emitEvent: false, });
    this.inventoryForm.controls.endDay.enable({ emitEvent: false, });
    this.inventoryForm.controls.days.enable({ emitEvent: false, });

    this.inventoryForm.patchValue(
      {
        inventoryConfigurationName: inventory.inventoryConfigurationName,
        startDay: days.length > 0 ? null : inventory.startDay,
        endDay: days.length > 0 ? null : inventory.endDay,
        days,
      },
      { emitEvent: false, }
    );

    if (days.length > 0) {

      this.inventoryForm.controls.startDay.disable({ emitEvent: false, });
      this.inventoryForm.controls.endDay.disable({ emitEvent: false, });

    } else if (inventory.startDay !== null || inventory.endDay !== null) {

      this.inventoryForm.controls.days.disable({ emitEvent: false, });
    }
  }

  private updateInventory(): void {
    this.inventoryValidationError = '';
    const inventoryConfigurationId = this.editingInventoryId();

    if (!inventoryConfigurationId) {
      return;
    }

    const inventoryConfigurationName = this.inventoryForm.controls.inventoryConfigurationName.value.trim().toUpperCase();
    const startDay = this.inventoryForm.controls.startDay.value;
    const endDay = this.inventoryForm.controls.endDay.value;
    const days = this.inventoryForm.controls.days.value;

    if (!inventoryConfigurationName) {
      this.inventoryValidationError = 'Debes ingresar el nombre del inventario.';
      return;
    }

    const usesDaysOfWeek = days.length > 0;

    if (!usesDaysOfWeek && startDay === null) {
      this.inventoryValidationError = 'Debes seleccionar el día desde o seleccionar uno o varios días de la semana.';
      return;
    }

    if (startDay !== null && endDay !== null && startDay > endDay) {
      this.inventoryValidationError = 'El día desde no puede ser mayor que el día hasta.';
      return;
    }

    const originalDays = this.originalInventoryDays;
    const daysToDelete = originalDays.filter(day => !days.includes(day));
    const daysToAdd = days.filter(day => !originalDays.includes(day));

    const updateMainConfiguration$ =
      this.inventoryConfigurationService
        .update(
          inventoryConfigurationId,
          {
            inventoryConfigurationName,
            startDay: usesDaysOfWeek ? null : startDay,
            endDay: usesDaysOfWeek ? null : endDay,
          }
        )
        .pipe(
          switchMap(response => {

            if (!response.isSuccess) {
              return throwError(() => new Error(response.message || 'No fue posible actualizar el inventario.'));
            }

            return of(true);
          })
        );

    this.creatingInventory.set(true);

    const request$ = usesDaysOfWeek
        ? updateMainConfiguration$
            .pipe(
              switchMap(() =>
                this.deleteInventoryDays(
                  inventoryConfigurationId,
                  daysToDelete
                )
              ),
              switchMap(() =>
                this.addInventoryDays(
                  inventoryConfigurationId,
                  daysToAdd
                )
              )
            )

        : this.deleteInventoryDays(
            inventoryConfigurationId,
            originalDays
          )
          .pipe(
            switchMap(() =>
              updateMainConfiguration$
            )
          );

    request$
      .pipe(
        finalize(() => {
          this.creatingInventory.set(false);
        })
      )
      .subscribe({
        next: () => {
          this.resetInventoryForm();
          this.inventoryValidationError = '';
          this.loadInventories(this.inventoryPage(), this.inventoryTake());
          const selectedSolutionCenterId = this.optionControl.value;

          if (selectedSolutionCenterId && (this.selectedType() === 1 || this.selectedType() === 2)) {
            this.loadSolutionCenterConfigurations(selectedSolutionCenterId);
          }

          this.responseModalService.show('success', 'Inventario actualizado', 'Configuración de inventario actualizada correctamente.');
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || error.message || 'Ocurrió un error al actualizar el inventario.';

          this.responseModalService.show('error', 'Error al actualizar inventario', message);
        },
      });
  }

  private deleteInventoryDays(inventoryConfigurationId: number, days: string[]) {

    if (days.length === 0) {
      return of(true);
    }

    return forkJoin(
      days.map(day =>
        this.inventoryConfigurationService.deleteDay(inventoryConfigurationId, day)
      )
    ).pipe(
      switchMap(responses => {
        const failedResponse = responses.find(response => !response.isSuccess);

        if (failedResponse) {
          return throwError(() => new Error(failedResponse.message || 'No fue posible eliminar uno de los días.'));
        }

        return of(true);
      })
    );
  }

  private addInventoryDays(inventoryConfigurationId: number, days: string[]) {

    if (days.length === 0) {
      return of(true);
    }

    return this.inventoryConfigurationService
      .addDays(inventoryConfigurationId, { days, })
      .pipe(
        switchMap(response => {

          if (!response.isSuccess) {
            return throwError(() => new Error(response.message || 'No fue posible agregar los días.'));
          }

          return of(true);
        })
      );
  }

  cancelInventoryForm(): void {

    if (this.editingInventoryId() !== null) {
      this.resetInventoryForm();
      this.inventoryValidationError = '';
      return;
    }

    this.closeCreateInventoryModal();
  }

  private loadAssignmentSolutionCenter(solutionCenterId: number, selectedSectionIds: number[] = []): void {
    this.loadingAssignmentSections.set(true);
    this.assignmentSolutionCenter.set(null);
    this.sectionAssignmentControl.setValue([]);
    this.inventoryConfigurationService
      .getSolutionCenter(solutionCenterId)
      .pipe(
        finalize(() => {
          this.loadingAssignmentSections.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess || !response.result) {
            this.assignmentSolutionCenter.set(null);
            this.responseModalService.show('error', 'Error al consultar secciones', response.message || 'No fue posible consultar las secciones.');
            return;
          }

          this.assignmentSolutionCenter.set(response.result);
          this.sectionAssignmentControl.setValue(selectedSectionIds);
        },

        error: error => {
          this.assignmentSolutionCenter.set(null);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar las secciones.';

          this.responseModalService.show('error', 'Error al consultar secciones', message);
        },
      });
  }

  assignInventory(): void {
    const inventoryConfigurationId = this.inventoryAssignmentControl.value;
    const solutionCenter = this.assignmentSolutionCenter();
    const sectionIds = this.sectionAssignmentControl.value;

    if (!inventoryConfigurationId) {
      this.responseModalService.show('warning', 'Inventario requerido', 'Debes seleccionar un inventario.');
      return;
    }

    if (!solutionCenter) {
      this.responseModalService.show('warning', 'Centro no disponible', 'No fue posible identificar la bodega o punto de venta.');
      return;
    }

    if (sectionIds.length === 0) {
      this.responseModalService.show('warning', 'Sección requerida', 'Debes seleccionar al menos una sección.');
      return;
    }

    const assignments =
      sectionIds.map(sectionId => ({
        solutionCenterId: solutionCenter.solutionCenterId,
        sectionId,
      }));

    this.assigningInventory.set(true);
    this.inventoryConfigurationService
      .assignInventory(inventoryConfigurationId, { assignments, })
      .pipe(
        finalize(() => {
          this.assigningInventory.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo asignar', response.message || 'No fue posible asignar el inventario.');
            return;
          }

          this.closeAssignInventoryModal();
          this.responseModalService.show('success', 'Inventario asignado', response.message || 'Inventario asignado correctamente.');
          this.loadSolutionCenterConfigurations(solutionCenter.solutionCenterId);
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al asignar el inventario.';

          this.responseModalService.show('error', 'Error al asignar inventario', message);
        },
      });
  }

  openViewInventoryConfiguration(configuration: InventoryConfigurationDetail): void {
    this.selectedInventoryConfiguration.set(configuration);
    this.viewInventoryConfigurationDialogRef =
      this.dialog.open(
        this.viewInventoryConfigurationModal,
        {
          width: '820px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          autoFocus: false,
          restoreFocus: false,
        }
      );
  }

  closeViewInventoryConfiguration(): void {
    this.viewInventoryConfigurationDialogRef?.close();
    this.viewInventoryConfigurationDialogRef = null;
    this.selectedInventoryConfiguration.set(null);
  }

  getConfigurationDays(configuration: InventoryConfigurationDetail): string {

    const days =
      configuration.days?.length > 0
        ? configuration.days
        : configuration.daysOfWeek?.map(item => item.dayOfWeek) ?? [];

    if (days.length === 0) {
      return '—';
    }

    return days
      .map(day => { return this.daysOfWeek.find(option => option.value === day)?.label ?? day; })
      .join(', ');
  }

  openEditInventoryAssignment(configuration: InventoryConfigurationDetail): void {
    const solutionCenterId = this.optionControl.value;

    if (!solutionCenterId) {
      this.responseModalService.show('warning', 'Centro no seleccionado', 'No fue posible identificar la bodega o punto de venta.');
      return;
    }

    const sectionIds = configuration.sections.map(section => section.sectionId);

    this.editingAssignmentConfigurationId.set(configuration.inventoryConfigurationId);

    this.originalAssignmentSectionIds = [
      ...sectionIds,
    ];

    this.availableInventories.set([
      {
        inventoryConfigurationId: configuration.inventoryConfigurationId,
        inventoryConfigurationName: configuration.inventoryConfigurationName,
        startDay: configuration.startDay,
        endDay: configuration.endDay,
        daysOfWeek: configuration.daysOfWeek ?? [],
      },
    ]);

    this.inventoryAssignmentControl.setValue(configuration.inventoryConfigurationId);
    this.assignmentSolutionCenter.set(null);
    this.loadAssignmentSolutionCenter(solutionCenterId, sectionIds);

    this.assignInventoryDialogRef =
      this.dialog.open(
        this.assignInventoryModal,
        {
          width: '720px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          disableClose: true,
          autoFocus: false,
        }
      );
  }

  saveInventoryAssignment(): void {

    if (this.editingAssignmentConfigurationId() !== null) {
      this.updateInventoryAssignment();
      return;
    }

    this.assignInventory();
  }

  private updateInventoryAssignment(): void {
    const inventoryConfigurationId = this.editingAssignmentConfigurationId();
    const solutionCenterId = this.optionControl.value;

    if (!inventoryConfigurationId || !solutionCenterId) {
      this.responseModalService.show('warning', 'Información incompleta', 'No fue posible identificar el inventario o el centro seleccionado.');
      return;
    }

    const selectedSectionIds = this.sectionAssignmentControl.value;
    const originalSectionIds = this.originalAssignmentSectionIds;
    const sectionIdsToAdd = selectedSectionIds.filter(sectionId => !originalSectionIds.includes(sectionId));
    const sectionIdsToDelete = originalSectionIds.filter(sectionId => !selectedSectionIds.includes(sectionId));

    if (sectionIdsToAdd.length === 0 && sectionIdsToDelete.length === 0) {
      this.responseModalService.show('info', 'Sin cambios', 'No realizaste cambios en las secciones asignadas.');
      return;
    }

    const addAssignments$ = sectionIdsToAdd.length === 0
        ? of(null)
        : this.inventoryConfigurationService
            .assignInventory(
              inventoryConfigurationId,
              {
                assignments:
                  sectionIdsToAdd.map(
                    sectionId => ({
                      solutionCenterId,
                      sectionId,
                    })
                  ),
              }
            )
            .pipe(
              switchMap(response => {

                if (!response.isSuccess) {
                  return throwError(() => new Error(response.message || 'No fue posible agregar las nuevas secciones.'));
                }

                return of(response);
              })
            );

    const deleteAssignments$ = sectionIdsToDelete.length === 0
        ? of([])
        : forkJoin(
            sectionIdsToDelete.map(
              sectionId =>
                this.inventoryConfigurationService
                  .deleteAssignment(
                    inventoryConfigurationId,
                    solutionCenterId,
                    sectionId
                  )
            )
          )
          .pipe(
            switchMap(responses => {
              const failedResponse = responses.find(response => !response.isSuccess);

              if (failedResponse) {
                return throwError(() => new Error(failedResponse.message || 'No fue posible eliminar una de las asignaciones.'));
              }

              return of(responses);
            })
          );

    this.assigningInventory.set(true);

    forkJoin({
      added: addAssignments$,
      deleted: deleteAssignments$,
    })
      .pipe(
        finalize(() => {
          this.assigningInventory.set(false);
        })
      )
      .subscribe({

        next: () => {
          this.closeAssignInventoryModal();
          this.loadSolutionCenterConfigurations(solutionCenterId);
          this.responseModalService.show('success', 'Asignación actualizada', 'Las secciones del inventario fueron actualizadas correctamente.');
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || error.message || 'Ocurrió un error al actualizar la asignación.';

          this.responseModalService.show('error', 'Error al actualizar asignación', message);
        },
      });
  }

  confirmDeleteInventoryAssignment(configuration: InventoryConfigurationDetail): void {
    const detail = this.solutionCenterConfigurations();

    if (!detail) {
      this.responseModalService.show('warning', 'Centro no disponible', 'No fue posible identificar la bodega o punto de venta.');
      return;
    }

    if (this.deletingConfigurationId() !== null) {
      return;
    }

    this.responseModalService
      .confirm(
        'warning',
        'Eliminar asignación',
        `¿Deseas retirar el inventario ${configuration.inventoryConfigurationName} de ${detail.solutionCenterCode} - ${detail.solutionCenterName}? Se eliminarán todas las secciones asignadas de este inventario en este centro.`,
        'Eliminar'
      )
      .subscribe(confirmed => {

        if (!confirmed) {
          return;
        }

        this.deleteInventoryAssignment(configuration.inventoryConfigurationId, detail.solutionCenterId);
      });
  }

  private deleteInventoryAssignment(inventoryConfigurationId: number, solutionCenterId: number): void {
    this.deletingConfigurationId.set(inventoryConfigurationId);
    this.inventoryConfigurationService
      .deleteSolutionCenterConfiguration(
        inventoryConfigurationId,
        solutionCenterId
      )
      .pipe(
        finalize(() => {
          this.deletingConfigurationId.set(null);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo eliminar', response.message || 'No fue posible retirar el inventario del centro de solución.');
            return;
          }

          this.responseModalService.show('success', 'Asignación eliminada', response.message || 'El inventario fue retirado correctamente.');
          this.loadSolutionCenterConfigurations(solutionCenterId);
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al retirar el inventario del centro de solución.';

          this.responseModalService.show('error', 'Error al eliminar asignación', message);
        },
      });
  }
}