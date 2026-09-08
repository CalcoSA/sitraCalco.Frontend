import { SolutionCenterService } from '../../../services/solution-center.service';
import { ResponseModalService } from '../../../services/response-modal.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SolutionCenterType } from '../../../models/solution-center.model';
import { SessionService } from '../../../services/session.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-create-warehouse',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatSelectModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './create-warehouse.html',
})

export class CreateWarehouse implements OnInit {

  private readonly solutionCenterService = inject(SolutionCenterService);
  private readonly responseModalService = inject(ResponseModalService);
  readonly solutionCenterTypes = signal<SolutionCenterType[]>([]);
  private readonly sessionService = inject(SessionService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly loadingTypes = signal(false);
  readonly saving = signal(false);
  validationError = '';

  readonly solutionCenterForm = this.formBuilder.nonNullable.group({
    solutionCenterTypeId: [0],
    solutionCenterCode: [''],
    solutionCenterName: [''],
  });

  ngOnInit(): void {
    this.loadSolutionCenterTypes();
  }

  loadSolutionCenterTypes(): void {
    this.loadingTypes.set(true);
    this.solutionCenterService.getTypes()
      .pipe(
        finalize(() => {
          this.loadingTypes.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.solutionCenterTypes.set([]);
            this.responseModalService.show('error', 'Error al cargar tipos', response.message || 'No fue posible consultar los tipos de centros de solución.');
            return;
          }

          const role = this.sessionService.getUser() ?.nameRole ?.trim().toUpperCase() ?? '';
          let types = response.result ?? [];

          if (role === 'ALMACEN') {
            types = types.filter(type => type.solution_center_type_name.trim().toUpperCase() !== 'BODEGA');
          }

          this.solutionCenterTypes.set(types);
        },

        error: (error) => {
          this.solutionCenterTypes.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los tipos de centros de solución.';

          this.responseModalService.show('error', 'Error al cargar tipos', message);
        },
      });
  }

  createSolutionCenter(): void {

    this.validationError = '';

    const solutionCenterTypeId = this.solutionCenterForm.controls.solutionCenterTypeId.value;
    const solutionCenterCode = this.solutionCenterForm.controls.solutionCenterCode.value.trim();
    const solutionCenterName = this.solutionCenterForm.controls.solutionCenterName.value.trim();

    if (solutionCenterTypeId <= 0) {
      this.validationError = 'Debes seleccionar un tipo de centro de solución.';
      return;
    }

    if (!solutionCenterCode) {
      this.validationError = 'Debes ingresar el código del centro de solución.';
      return;
    }

    if (!solutionCenterName) {
      this.validationError = 'Debes ingresar el nombre del centro de solución.';
      return;
    }

    this.saving.set(true);
    this.solutionCenterForm.disable();
    this.solutionCenterService
      .create({
        solutionCenterTypeId,
        solutionCenterCode,
        solutionCenterName,
      })
      .pipe(
        finalize(() => {
          this.saving.set(false);
          this.solutionCenterForm.enable();
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo crear', response.message || 'No se pudo crear el centro de solución.');
            return;
          }

          this.solutionCenterForm.reset({
            solutionCenterTypeId: 0,
            solutionCenterCode: '',
            solutionCenterName: '',
          });

          this.validationError = '';
        },

        error: (error) => {

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al crear el centro de solución.';

          this.responseModalService.show('error', 'Error al crear', message);
        },
      });
  }

  clearForm(): void {
    this.solutionCenterForm.reset({
      solutionCenterTypeId: 0,
      solutionCenterCode: '',
      solutionCenterName: '',
    });

    this.validationError = '';
  }

  goBack(): void {
    this.router.navigateByUrl('/inventarios/configuracion-bodega');
  }
}