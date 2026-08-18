import { Component, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ResponseModalService } from '../../services/response-modal.service';
import { Role, RoleCreate, RoleUpdate } from '../../models/role.model';
import { MenuOptionService } from '../../services/menu-option.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MenuOption } from '../../models/menu-option.model';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { RoleService } from '../../services/role.service';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { HttpErrorResponse } from '@angular/common/http';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

type RoleModalMode = 'create' | 'update';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSelectModule,
    MatButtonModule,
    MatChipsModule,
    MatTableModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './roles.html',
})

export class Roles implements OnInit {

  @ViewChild('roleFormModal')
  private roleFormModal!: TemplateRef<void>;

  @ViewChild('roleViewModal')
  private roleViewModal!: TemplateRef<void>;

  private readonly responseModalService = inject(ResponseModalService);
  private readonly menuOptionService = inject(MenuOptionService);
  readonly loadingRoleId = signal<number | null>(null);
  readonly viewMenuOptions = signal<MenuOption[]>([]);
  private readonly roleService = inject(RoleService);
  private readonly formBuilder = inject(FormBuilder);
  readonly MenuOptions = signal<MenuOption[]>([]);
  private roleFormDialogRef?: MatDialogRef<any>;
  private roleViewDialogRef?: MatDialogRef<any>;
  private readonly dialog = inject(MatDialog);
  readonly loadingMenuOptions = signal(false);
  readonly loadingView = signal(false);
  modalMode: RoleModalMode = 'create';
  hoveredButton: string | null = null;
  readonly roles = signal<Role[]>([]);
  selectedRole: Role | null = null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  validationError = '';

  readonly roleForm = this.formBuilder.nonNullable.group({
    nameRole: [''],
    statusRole: [true],
    menuOptionIds: this.formBuilder.nonNullable.control<number[]>([]),
  });

  readonly displayedColumns: string[] = [
    'idRole',
    'nameRole',
    'statusRole',
    'actions',
  ];

  ngOnInit(): void {
    this.loadRoles();
    this.loadMenuOptions();
  }

  loadRoles(): void {
    this.loading.set(true);
    this.roleService
      .getAll()
      .pipe(
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
          this.roles.set([]);
          this.responseModalService.show('error', 'Error al cargar', response.message || 'No fue posible consultar los roles.');

          return;
        }
        this.roles.set(response.result ?? []);
        },

        error: (error) => {
          this.roles.set([]);

          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al consultar los roles.';

          this.responseModalService.show('error', 'Error al cargar roles', message);
        },
      });
  }

  loadMenuOptions(): void {
    this.loadingMenuOptions.set(true);
    this.menuOptionService
      .getAll()
      .pipe(
        finalize(() => {
          this.loadingMenuOptions.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.MenuOptions.set([]);
            this.responseModalService.show('error', 'Error al cargar opciones de menú', response.message || 'No fue posible consultar las opciones de menú.');

            return;
          }
          this.MenuOptions.set(response.result ?? []);
        },

        error: (error: HttpErrorResponse) => {
          this.MenuOptions.set([]);

          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al consultar los roles.';

          this.responseModalService.show('error', 'Error al cargar opciones de menú', message);
        },
      });
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedRole = null;
    this.validationError = '';
    this.roleForm.reset({
      nameRole: '',
      statusRole: true,
      menuOptionIds: [],
    });
    this.roleFormDialogRef = this.dialog.open(
      this.roleFormModal,
      {
        width: '100%',
        maxWidth: '600px',
        disableClose: true,
      }
    );
  }

  createRole(): void {
    this.validationError = '';
    const form = this.roleForm.getRawValue();
    const nameRole = form.nameRole.trim();

    if (!nameRole) {
      this.validationError = 'El nombre del rol es obligatorio.';
      return;
    }

    if (form.menuOptionIds.length === 0) {
      this.validationError = 'Debes seleccionar al menos una opción de menú.';
      return;
    }

    const data: RoleCreate = {
      nameRole,
      statusRole: form.statusRole ? 1 : 0,
      menuOptionIds: form.menuOptionIds,
    };

    this.saving.set(true);
    this.roleForm.disable();
    this.roleService
      .create(data)
      .pipe(
        finalize(() => {
          this.saving.set(false);
          this.roleForm.enable();
        })
      )
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo crear', response.message || 'No fue posible crear el rol.');
            return;
          }
          this.roleFormDialogRef?.close();
          this.loadRoles();
          this.responseModalService.show('success', 'Rol creado', response.message);
          this.selectedRole = null;
          this.validationError = '';
          this.roleForm.reset({
            nameRole: '',
            statusRole: true,
            menuOptionIds: [],
          });
        },
        error: (error: HttpErrorResponse) => {
          let message = 'Ocurrió un error al crear el rol.';

          if (error.status === 0) {
            message = 'No fue posible comunicarse con el servidor.';
          } else if (Array.isArray(error.error?.result) && error.error.result.length > 0) {
            message = error.error.result.join(' ');
          } else if (error.error?.message) {
            message = error.error.message;
          }

          this.responseModalService.show('error', 'Error al crear rol', message);
        },
      });
  }

  openUpdateModal(role: Role): void {
    this.validationError = '';
    this.loadingRoleId.set(role.idRole);
    this.roleService
      .getById(role.idRole)
      .pipe(
        finalize(() => {
          this.loadingRoleId.set(null);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('error', 'Error al consultar rol', response.message || 'No fue posible consultar la información del rol.');
            return;
          }

          this.modalMode = 'update';
          this.selectedRole = response.result;
          this.roleForm.reset({
            nameRole: response.result.nameRole,
            statusRole: response.result.statusRole === 1,
            menuOptionIds: response.result.menuOptions.map(option => option.idMenuOption),
          });
          this.roleFormDialogRef =
            this.dialog.open(
              this.roleFormModal,
              {
                width: '100%',
                maxWidth: '600px',
                disableClose: true,
              }
            );
        },
        error: (error: HttpErrorResponse) => {
          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al consultar el rol.';

          this.responseModalService.show('error', 'Error al consultar rol', message);
        },
      });
  }

  updateRole(): void {
    this.validationError = '';

    if (!this.selectedRole) {
      this.responseModalService.show('error', 'Error', 'No hay un rol seleccionado para actualizar.');
      return;
    }

    const form = this.roleForm.getRawValue();
    const nameRole = form.nameRole.trim();

    if (!nameRole) {
      this.validationError = 'El nombre del rol es obligatorio.';
      return;
    }

    if (form.menuOptionIds.length === 0) {
      this.validationError = 'Debes seleccionar al menos una opción de menú.';
      return;
    }

    const data: RoleUpdate = {
      idRole: this.selectedRole.idRole,
      nameRole,
      statusRole: form.statusRole ? 1 : 0,
      menuOptionIds: form.menuOptionIds,
    };

    this.saving.set(true);
    this.roleForm.disable();
    this.roleService
      .update(data)
      .pipe(
        finalize(() => {
          this.saving.set(false);
          this.roleForm.enable();
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo actualizar', response.message || 'No fue posible actualizar el rol.');
            return;
          }

          this.roleFormDialogRef?.close();
          this.loadRoles();
          this.responseModalService.show('success', 'Rol actualizado', response.message);
          this.selectedRole = null;
          this.validationError = '';
          this.roleForm.reset({
            nameRole: '',
            statusRole: true,
            menuOptionIds: [],
          });
        },
        error: (error: HttpErrorResponse) => {
          let message = 'Ocurrió un error al actualizar el rol.';

          if (error.status === 0) {
            message = 'No fue posible comunicarse con el servidor.';
          } else if (Array.isArray(error.error?.result) && error.error.result.length > 0) {
            message = error.error.result.join(' ');
          } else if (error.error?.message) {
            message = error.error.message;
          }

          this.responseModalService.show('error', 'Error al actualizar rol', message);
        },
      });
  }

  closeRoleFormModal(): void {

    if (this.saving()) {
      return;
    }

    this.roleFormDialogRef?.close();
    this.selectedRole = null;
    this.validationError = '';
    this.roleForm.reset({
      nameRole: '',
      statusRole: true,
      menuOptionIds: [],
    });
  }

  openViewModal(role: Role): void {
    this.selectedRole = role;
    this.viewMenuOptions.set([]);
    this.loadingView.set(true);
    this.roleViewDialogRef =
      this.dialog.open(
        this.roleViewModal,
        {
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          disableClose: true,
        }
      );
    this.menuOptionService
      .getByRole(role.idRole)
      .pipe(
        finalize(() => {
          this.loadingView.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.roleViewDialogRef?.close();
            this.responseModalService.show('error', 'Error al consultar permisos', response.message || 'No fue posible consultar los permisos del rol.');
            return;
          }

          this.viewMenuOptions.set(response.result ?? []);
        },
        error: (error: HttpErrorResponse) => {
          this.roleViewDialogRef?.close();

          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al consultar los permisos del rol.';

          this.responseModalService.show('error', 'Error al consultar permisos', message);
        },
      });
  }

  closeViewModal(): void {

    if (this.loadingView()) {
      return;
    }

    this.roleViewDialogRef?.close();
    this.selectedRole = null;
    this.viewMenuOptions.set([]);
  }
}