import { Component, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WordpressUserService } from '../../services/wordpress-user.service';
import { ResponseModalService } from '../../services/response-modal.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../services/user.service';
import { RoleService } from '../../services/role.service';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { EMPTY, finalize, switchMap } from 'rxjs';
import { Role } from '../../models/role.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatDialogModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './users.html',
})

export class Users {

  @ViewChild('updateUserModal')
  updateUserModal!: TemplateRef<unknown>;

  private readonly responseModalService = inject(ResponseModalService);
  private readonly wordpressUserService = inject(WordpressUserService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  readonly selectedUser = signal<User | null>(null);
  private updateDialogRef?: MatDialogRef<unknown>;
  private readonly dialog = inject(MatDialog);
  readonly loadingRoles = signal(false);
  readonly roles = signal<Role[]>([]);
  readonly users = signal<User[]>([]);
  readonly updating = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly take = signal(10);
  updateValidationError = '';
  readonly page = signal(1);
  validationError = '';

  readonly displayedColumns: string[] = [
    'userLogin',
    'userName',
    'nameRole',
    'statusUser',
    'actions',
  ];

  readonly searchControl = this.formBuilder.nonNullable.control('');

  readonly userForm = this.formBuilder.nonNullable.group({
    userLogin: [''],
    idRole: [0],
  });

  readonly updateUserForm = this.formBuilder.nonNullable.group({
    idRole: [0],
    statusUser: [true],
  });

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  loadUsers(page = this.page(), take = this.take(), search = this.searchControl.value.trim()): void {
    this.loading.set(true);
    this.userService
      .getAll(page, take, search)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.users.set([]);
            this.total.set(0);
            this.responseModalService.show('error', 'Error al cargar usuarios', response.message || 'No fue posible consultar los usuarios.');
            return;
          }

          this.users.set(response.result.items ?? []);
          this.total.set(response.result.total ?? 0);
          this.pages.set(response.result.pages ?? 0);
          this.page.set(response.result.page);
          this.take.set(response.result.take);
        },

        error: (error) => {
          this.users.set([]);
          this.total.set(0);
          this.pages.set(0);

          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al consultar los usuarios.';

          this.responseModalService.show('error', 'Error al cargar usuarios', message);
        },
      });
  }

  searchUsers(): void {
    this.page.set(1);
    this.loadUsers(1, this.take(), this.searchControl.value.trim());
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.page.set(1);
    this.loadUsers(1, this.take(), '');
  }

  changePageSize(take: number): void {
    this.take.set(take);
    this.page.set(1);
    this.loadUsers(1, take, this.searchControl.value.trim());
  }

  previousPage(): void {
    if (this.page() <= 1) {
      return;
    }

    const previousPage = this.page() - 1;

    this.page.set(previousPage);
    this.loadUsers(previousPage, this.take(), this.searchControl.value.trim());
  }

  nextPage(): void {
    if (this.page() >= this.pages()) {
      return;
    }

    const nextPage = this.page() + 1;

    this.page.set(nextPage);
    this.loadUsers(nextPage, this.take(), this.searchControl.value.trim());
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
        next: (response) => {

          if (!response.isSuccess) {
            this.roles.set([]);
            this.responseModalService.show('error', 'Error al cargar roles', response.message || 'No fue posible consultar los roles.');
            return;
          }

          this.roles.set((response.result ?? []).filter(role => role.statusRole === 1));
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

  createUser(): void {
    this.validationError = '';
    const userLogin = this.userForm.controls.userLogin.value.trim();
    const idRole = this.userForm.controls.idRole.value;

    if (!userLogin) {
      this.validationError = 'Debes ingresar el usuario de intranet.';
      return;
    }

    if (userLogin.length < 3) {
      this.validationError = 'Debes ingresar mínimo 3 caracteres.';
      return;
    }

    if (idRole <= 0) {
      this.validationError = 'Debes seleccionar un rol.';
      return;
    }

    this.saving.set(true);
    this.userForm.disable();
    this.wordpressUserService
      .getWordpressUser(userLogin)
      .pipe(
        switchMap(wordpressResponse => {

          if (!wordpressResponse.isSuccess || !wordpressResponse.result) {
            this.responseModalService.show('warning', 'Usuario no encontrado', 'No se encontró ningún usuario de intranet con el criterio ingresado.');
            return EMPTY;
          }

          const wordpressUser = wordpressResponse.result;

          return this.userService.create({
            wordpressUserId: wordpressUser.wordpressUserId,
            userLogin: wordpressUser.wordpressUserLogin,
            userName:  wordpressUser.wordpressDisplayName,
            statusUser: true,
            idRole,
          });
        }),

        finalize(() => {
          this.saving.set(false);
          this.userForm.enable();
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo crear', response.message || 'No se pudo autorizar el usuario.');
            return;
          }

          this.userForm.reset({
            userLogin: '',
            idRole: 0,
          });

          this.loadUsers(this.page(), this.take(), this.searchControl.value.trim());
          this.responseModalService.show('success', 'Usuario autorizado', response.message || 'Usuario autorizado correctamente.');
        },
        error: (error) => {

          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || error.message || 'Ocurrió un error al autorizar el usuario.';

          this.responseModalService.show('error', 'Error en la operación', message);
        },
      });
  }

  openUpdateModal(user: User): void {
    this.selectedUser.set(user);
    this.updateValidationError = '';
    this.updateUserForm.reset({
      idRole: user.idRole,
      statusUser: user.statusUser,
    });
    this.updateDialogRef = this.dialog.open(
      this.updateUserModal,
      {
        width: '100%',
        maxWidth: '600px',
        disableClose: true,
      }
    );
  }

  closeUpdateModal(): void {
    if (this.updating()) {
      return;
    }

    this.updateDialogRef?.close();
    this.selectedUser.set(null);
    this.updateValidationError = '';
  }

  updateUser(): void {
    const user = this.selectedUser();

    if (!user) {
      return;
    }

    this.updateValidationError = '';

    const idRole = this.updateUserForm.controls.idRole.value;
    const statusUser = this.updateUserForm.controls.statusUser.value;

    if (idRole <= 0) {
      this.updateValidationError = 'Debes seleccionar un rol.';
      return;
    }

    this.updating.set(true);
    this.updateUserForm.disable();
    this.userService
      .update({
        idUser: user.idUser,
        statusUser,
        idRole,
      })
      .pipe(
        finalize(() => {
          this.updating.set(false);
          this.updateUserForm.enable();
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo actualizar', response.message || 'No fue posible actualizar el usuario.');
            return;
          }

          this.updateDialogRef?.close();
          this.selectedUser.set(null);
          this.loadUsers(this.page(), this.take(), this.searchControl.value.trim());
          this.responseModalService.show('success', 'Usuario actualizado', response.message || 'Usuario actualizado correctamente.'
          );
        },

        error: (error) => {

          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al actualizar el usuario.';

          this.responseModalService.show('error', 'Error en la operación', message);
        },
      });
  }
}