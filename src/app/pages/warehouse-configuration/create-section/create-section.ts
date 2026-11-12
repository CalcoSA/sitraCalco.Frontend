import { SolutionCenterService } from '../../../services/solution-center.service';
import { ResponseModalService } from '../../../services/response-modal.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { SolutionCenterType } from '../../../models/solution-center.model';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SectionService } from '../../../services/section.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { Section } from '../../../models/section.model';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-create-section',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatFormFieldModule,    
    MatTooltipModule,
    MatSelectModule,
    MatButtonModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
  ],
  templateUrl: './create-section.html',
})

export class CreateSection implements OnInit {

  private readonly solutionCenterService = inject(SolutionCenterService);
  private readonly responseModalService = inject(ResponseModalService);
  private readonly sectionService = inject(SectionService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly solutionCenterTypes = signal<SolutionCenterType[]>([]);
  readonly editingSectionId = signal<number | null>(null);
  readonly sections = signal<Section[]>([]);

  readonly loadingTypes = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);  

  readonly isEditing = computed(() => this.editingSectionId() !== null);

  validationError = '';

  readonly displayedColumns: string[] = [
    'sectionName',
    'solutionCenterTypeName',
    'isActive',
    'actions',
  ];

  readonly sectionForm = this.formBuilder.nonNullable.group({
    sectionName: [''],
    solutionCenterTypeId: [0],
    isActive: [
      {
        value: true,
        disabled: true,
      }
    ],
  });

  ngOnInit(): void {
    this.loadSolutionCenterTypes();
    this.loadSections();
  }

  loadSections(): void {
    this.loading.set(true);
    this.sectionService
      .getAll()
      .pipe(
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.sections.set([]);
            return;
          }

          this.sections.set(response.result ?? []);
        },

        error: (error) => {
          this.sections.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar las secciones.';

          this.responseModalService.show('error', 'Error al cargar secciones', message);
        },
      });
  }

  loadSolutionCenterTypes(): void {
    this.loadingTypes.set(true);
    this.solutionCenterService
      .getTypes()
      .pipe(
        finalize(() => {
          this.loadingTypes.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.solutionCenterTypes.set([]);
            return;
          }

          this.solutionCenterTypes.set(response.result ?? []);
        },

        error: (error) => {
          this.solutionCenterTypes.set([]);

          const message =
            error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los tipos de centro.';

          this.responseModalService.show('error', 'Error al cargar tipos', message);
        },
      });
  }

  saveSection(): void {
    this.validationError = '';
    const sectionName = this.sectionForm.controls.sectionName.value.trim();

    if (!sectionName) {
      this.validationError = 'Debes ingresar el nombre de la sección.';
      return;
    }

    if (this.isEditing()) {
      this.updateSection(sectionName);
      return;
    }

    const solutionCenterTypeId = this.sectionForm.controls.solutionCenterTypeId.value;

    if (solutionCenterTypeId <= 0) {
      this.validationError = 'Debes seleccionar un tipo de centro.';
      return;
    }

    this.createSection(sectionName, solutionCenterTypeId);
  }

  private createSection(sectionName: string, solutionCenterTypeId: number): void {
    this.saving.set(true);
    this.sectionService
      .create({
        sectionName,
        solutionCenterTypeId,
      })
      .pipe(
        finalize(() => {
          this.saving.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo crear', response.message || 'No fue posible crear la sección.');
            return;
          }

          this.resetForm();
          this.loadSections();

          this.responseModalService.show('success', 'Sección creada', response.message || 'Sección creada correctamente.');
        },

        error: (error) => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al crear la sección.';

          this.responseModalService.show('error', 'Error al crear sección', message);
        },
      });
  }

  private updateSection(sectionName: string): void {
    const sectionId = this.editingSectionId();

    if (!sectionId) {
      return;
    }

    const isActive = this.sectionForm.controls.isActive.value;
    const solutionCenterTypeId = this.sectionForm.controls.solutionCenterTypeId.value;

    if (solutionCenterTypeId <= 0) {
      this.validationError = 'Debes seleccionar un tipo de centro.';
      return;
    }

    this.saving.set(true);
    this.sectionService
      .update(
        sectionId,
        {
          sectionName,
          isActive,
          solutionCenterTypeId,
        }
      )
      .pipe(
        finalize(() => {
          this.saving.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo actualizar', response.message || 'No fue posible actualizar la sección.');
            return;
          }

          this.resetForm();
          this.loadSections();
          this.responseModalService.show('success', 'Sección actualizada', response.message || 'Sección actualizada correctamente.');
        },

        error: (error) => {

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al actualizar la sección.';

          this.responseModalService.show('error', 'Error al actualizar sección', message);
        },
      });
  }

  editSection(section: Section): void {
    this.validationError = '';
    this.editingSectionId.set(section.sectionId);
    this.sectionForm.controls.sectionName.setValue(section.sectionName);
    this.sectionForm.controls.solutionCenterTypeId.setValue(section.solutionCenterTypeId);
    this.sectionForm.controls.solutionCenterTypeId.enable();
    this.sectionForm.controls.isActive.enable();
    this.sectionForm.controls.isActive.setValue(section.isActive);
  }

  cancelEdit(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.editingSectionId.set(null);
    this.sectionForm.reset({
      sectionName: '',
      solutionCenterTypeId: 0,
      isActive: true,
    });
    this.sectionForm.controls.solutionCenterTypeId.enable();
    this.sectionForm.controls.isActive.disable();
    this.validationError = '';
  }

  onSectionNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upperValue = input.value.toUpperCase();

    input.value = upperValue;

    this.sectionForm.controls.sectionName.setValue(upperValue, { emitEvent: false });
  }

  goBack(): void {
    this.router.navigateByUrl('/inventarios/configuracion-bodega');
  }
}