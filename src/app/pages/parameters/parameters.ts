import { Permission, PermissionCreate, PermissionUpdate, } from '../../models/permission.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ResponseModalService } from '../../services/response-modal.service';
import { Component, computed, inject, OnInit, signal, } from '@angular/core';
import { PermissionService } from '../../services/permission.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { RoleService } from '../../services/role.service';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { Role } from '../../models/role.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-parameters',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatButtonModule,
    MatSelectModule,
    MatChipsModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
  ],
  templateUrl: './parameters.html',
})

export class Parameters implements OnInit {

  private readonly responseModalService = inject(ResponseModalService);
  private readonly permissionService = inject(PermissionService);
  private readonly roleService = inject(RoleService);  
  private readonly formBuilder = inject(FormBuilder);

  readonly editingPermissionId = signal<number | null>(null);
  readonly permissions = signal<Permission[]>([]);
  readonly roles = signal<Role[]>([]);

  readonly loadingRoles = signal(false);
  readonly loading = signal(false);  
  readonly saving = signal(false);

  readonly isEditing = computed(() => this.editingPermissionId() !== null);

  validationError = '';

  readonly displayedColumns: string[] = [
    'permissionKey',
    'permissionValue',
    'actions',
  ];

  readonly permissionForm = this.formBuilder.nonNullable.group({
      permissionKey: [''],
      roleNames: this.formBuilder.nonNullable.control<string[]>([]),
    });

  ngOnInit(): void {
    this.loadPermissions();
    this.loadRoles();
  }

  loadPermissions(): void {
    this.loading.set(true);
    this.permissionService
      .getAll()
      .pipe(
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.permissions.set([]);
            this.responseModalService.show('error', 'Error al cargar permisos', response.message || 'No fue posible consultar los permisos.');
            return;
          }

          this.permissions.set(response.result ?? []);
        },

        error: error => {
          this.permissions.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los permisos.';

          this.responseModalService.show('error', 'Error al cargar permisos', message);
        },
      });
  }

  loadRoles(): void {
    this.loadingRoles.set(true);
    this.roleService
      .getAll()
      .pipe(
        finalize(() => {
          this.loadingRoles.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.roles.set([]);
            this.responseModalService.show('error', 'Error al cargar roles', response.message || 'No fue posible consultar los roles.');
            return;
          }

          this.roles.set(response.result ?? []);
        },

        error: error => {
          this.roles.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los roles.';

          this.responseModalService.show('error', 'Error al cargar roles', message);
        },
      });
  }

  savePermission(): void {
    this.validationError = '';

    const form = this.permissionForm.getRawValue();
    const permissionKey = form.permissionKey.trim().toUpperCase();
    const roleNames = form.roleNames;

    if (!permissionKey) {
      this.validationError = 'Debes ingresar el nombre del permiso.';
      return;
    }

    if (roleNames.length === 0) {
      this.validationError = 'Debes seleccionar al menos un rol.';
      return;
    }

    const permissionValue = roleNames.map(role => role.trim().toUpperCase()).join(',');

    if (this.isEditing()) {
      this.updatePermission(permissionKey, permissionValue);
      return;
    }

    this.createPermission(permissionKey, permissionValue);
  }

  private createPermission(permissionKey: string, permissionValue: string): void {
    const data: PermissionCreate = {
      permissionKey,
      permissionValue,
    };

    this.saving.set(true);
    this.permissionService
      .create(data)
      .pipe(
        finalize(() => {
          this.saving.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo crear', response.message || 'No fue posible crear el permiso.');
            return;
          }

          this.resetForm();
          this.loadPermissions();
          this.responseModalService.show('success', 'Permiso creado', response.message || 'Permiso creado correctamente.');
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al crear el permiso.';

          this.responseModalService.show('error', 'Error al crear permiso', message);
        },
      });
  }

  private updatePermission(permissionKey: string, permissionValue: string): void {
    const permissionId = this.editingPermissionId();

    if (!permissionId) {
      return;
    }

    const data: PermissionUpdate = {
      permissionKey,
      permissionValue,
    };

    this.saving.set(true);
    this.permissionService
      .update(
        permissionId,
        data
      )
      .pipe(
        finalize(() => {
          this.saving.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo actualizar', response.message || 'No fue posible actualizar el permiso.');
            return;
          }

          this.resetForm();
          this.loadPermissions();
          this.responseModalService.show('success', 'Permiso actualizado', response.message || 'Permiso actualizado correctamente.');
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al actualizar el permiso.';

          this.responseModalService.show('error', 'Error al actualizar permiso', message);
        },
      });
  }

  editPermission(permission: Permission): void {
    this.validationError = '';
    this.editingPermissionId.set(permission.permissionId);

    const selectedRoles =
      permission.permissionValue
        .split(',')
        .map(
          role =>
            role.trim()
        )
        .filter(
          role =>
            role.length > 0
        )
        .map(permissionRole => {
          const existingRole = this.roles().find(role => role.nameRole.trim().toUpperCase() === permissionRole.toUpperCase());
          return existingRole?.nameRole ?? permissionRole;
        });


    this.permissionForm.reset({
      permissionKey: permission.permissionKey,
      roleNames: selectedRoles,
    });

    this.permissionForm.controls.permissionKey.disable();
  }

  cancelEdit(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.editingPermissionId.set(null);
    this.permissionForm.controls
      .permissionKey
      .enable({
        emitEvent: false,
      });

    this.permissionForm.reset(
      {
        permissionKey: '',
        roleNames: [],
      },
      {
        emitEvent: false,
      }
    );

    this.validationError = '';
  }

  onPermissionKeyInput(event: Event): void {

    if (this.isEditing()) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const value = input.value.toUpperCase();

    input.value = value;

    this.permissionForm.controls
      .permissionKey
      .setValue(
        value,
        {
          emitEvent: false,
        }
      );
  }

  getPermissionRoles(permissionValue: string): string[] {

    if (!permissionValue) {
      return [];
    }

    return permissionValue
      .split(',')
      .map(
        role =>
          role.trim()
      )
      .filter(Boolean);
  }
}