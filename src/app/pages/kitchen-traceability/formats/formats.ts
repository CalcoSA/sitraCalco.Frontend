import { Component, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ResponseModalService } from '../../../services/response-modal.service';
import { ReceptionTypeService } from '../../../services/reception-type.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ReceptionType } from '../../../models/reception-type.model';
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
  selector: 'app-formats',
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
  templateUrl: './formats.html',
})

export class Formats implements OnInit {

  @ViewChild('receptionTypeModal')
  receptionTypeModal!: TemplateRef<unknown>;

  private readonly responseModalService = inject(ResponseModalService);
  private readonly receptionTypeService = inject(ReceptionTypeService);
  readonly selectedReceptionType = signal<ReceptionType | null>(null);
  private receptionTypeDialogRef?: MatDialogRef<unknown>;
  readonly receptionTypes = signal<ReceptionType[]>([]);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly take = signal(10);
  readonly page = signal(1);  
  validationError = '';

  readonly displayedColumns: string[] = [
    'form_code',
    'name',
    'is_active',
    'actions',
  ];

  readonly receptionTypeForm = this.formBuilder.nonNullable.group({
    name: [''],
    form_code: [''],
    is_active: [true],
  });

  readonly searchControl = this.formBuilder.nonNullable.control('');

  ngOnInit(): void {
    this.loadReceptionTypes();
  }

  loadReceptionTypes(page = this.page(), take = this.take(), search = this.searchControl.value.trim()): void {
    this.loading.set(true);
    this.receptionTypeService
      .getAll(page, take, search)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.result) {
            this.receptionTypes.set([]);
            this.total.set(0);
            this.pages.set(0);
            this.responseModalService.show('error', 'Error al cargar formatos', response.message || 'No fue posible consultar los formatos.');
            return;
          }

          this.receptionTypes.set(response.result.items ?? []);
          this.total.set(response.result.totalRecords ?? 0);
          this.pages.set(response.result.totalPages ?? 0);
          this.page.set(response.result.pageNumber);
          this.take.set(response.result.pageSize);
        },

        error: (error) => {

          this.receptionTypes.set([]);
          this.total.set(0);
          this.pages.set(0);

          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al consultar los formatos.';

          this.responseModalService.show('error', 'Error al cargar formatos', message);
        },
      });
  }

  searchReceptionTypes(): void {
    this.page.set(1);
    this.loadReceptionTypes(1, this.take(), this.searchControl.value.trim());
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.page.set(1);
    this.loadReceptionTypes(1, this.take(), '');
  }

  changePageSize(take: number): void {
    this.take.set(take);
    this.page.set(1);
    this.loadReceptionTypes(1, take, this.searchControl.value.trim());
  }

  previousPage(): void {

    if (this.page() <= 1) {
      return;
    }

    const previousPage = this.page() - 1;

    this.page.set(previousPage);
    this.loadReceptionTypes(previousPage, this.take(), this.searchControl.value.trim());
  }

  nextPage(): void {

    if (this.page() >= this.pages()) {
      return;
    }

    const nextPage = this.page() + 1;

    this.page.set(nextPage);
    this.loadReceptionTypes(nextPage, this.take(), this.searchControl.value.trim());
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

  openCreateModal(): void {
    this.selectedReceptionType.set(null);
    this.validationError = '';
    this.receptionTypeForm.reset({
      name: '',
      form_code: '',
      is_active: true,
    });

    this.receptionTypeDialogRef = this.dialog.open(
      this.receptionTypeModal,
      {
        width: '100%',
        maxWidth: '600px',
        disableClose: true,
      }
    );
  }

  openUpdateModal(receptionType: ReceptionType): void {
    this.selectedReceptionType.set(receptionType);
    this.validationError = '';

    this.receptionTypeForm.reset({
      name: receptionType.name,
      form_code: receptionType.form_code ?? '',
      is_active: receptionType.is_active ?? false,
    });

    this.receptionTypeDialogRef = this.dialog.open(
      this.receptionTypeModal,
      {
        width: '100%',
        maxWidth: '600px',
        disableClose: true,
      }
    );
  }

  closeModal(): void {

    if (this.saving()) {
      return;
    }

    this.receptionTypeDialogRef?.close();
    this.selectedReceptionType.set(null);
    this.validationError = '';
  }

  saveReceptionType(): void {
    this.validationError = '';

    const name = this.receptionTypeForm.controls.name.value.trim();
    const formCode = this.receptionTypeForm.controls.form_code.value.trim();
    const isActive = this.receptionTypeForm.controls.is_active.value;

    if (!name) {
      this.validationError = 'El nombre del formato es obligatorio.';
      return;
    }

    if (!formCode) {
      this.validationError = 'El código del formato es obligatorio.';
      return;
    }

    const selectedReceptionType = this.selectedReceptionType();

    this.saving.set(true);
    this.receptionTypeForm.disable();

    const request$ = selectedReceptionType
      ? this.receptionTypeService.update(
          selectedReceptionType.reception_type_id,
          {
            name,
            form_code: formCode,
            is_active: isActive,
          }
        )
      : this.receptionTypeService.create({
          name,
          form_code: formCode,
          is_active: isActive,
        });

    request$
      .pipe(
        finalize(() => {
          this.saving.set(false);
          this.receptionTypeForm.enable();
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', selectedReceptionType ? 'No se pudo actualizar' : 'No se pudo crear', response.message || 'No fue posible guardar el formato.');
            return;
          }

          this.receptionTypeDialogRef?.close();
          this.selectedReceptionType.set(null);
          this.loadReceptionTypes(this.page(), this.take(), this.searchControl.value.trim());
          this.responseModalService.show(
            'success',
            selectedReceptionType
              ? 'Formato actualizado'
              : 'Formato creado',
            response.message ||
              (
                selectedReceptionType
                  ? 'Formato actualizado correctamente.'
                  : 'Formato creado correctamente.'
              )
          );
        },

        error: (error) => {
          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al guardar el formato.';

          this.responseModalService.show('error', 'Error en la operación', message);
        },
      });
  }
}