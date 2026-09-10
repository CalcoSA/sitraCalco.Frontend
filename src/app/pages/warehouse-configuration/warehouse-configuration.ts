import { SolutionCenter, SolutionCenterDetail } from '../../models/solution-center.model';
import { Component, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolutionCenterService } from '../../services/solution-center.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ResponseModalService } from '../../services/response-modal.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { SessionService } from '../../services/session.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-warehouse-configuration',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatTooltipModule,
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,    
  ],
  templateUrl: './warehouse-configuration.html',
})

export class WarehouseConfiguration implements OnInit {

  @ViewChild('viewSolutionCenterModal', { static: true })
  private viewSolutionCenterModal!: TemplateRef<unknown>;

  readonly solutionCenterDetail = signal<SolutionCenterDetail | null>(null);
  private readonly solutionCenterService = inject(SolutionCenterService);
  private readonly responseModalService = inject(ResponseModalService);
  private viewDialogRef: MatDialogRef<unknown> | null = null;
  private readonly sessionService = inject(SessionService);
  readonly solutionCenters = signal<SolutionCenter[]>([]);
  readonly updatingStatusId = signal<number | null>(null);
  private readonly dialog = inject(MatDialog);
  readonly loadingDetail = signal(false);
  readonly loading = signal(false);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly take = signal(10);
  readonly page = signal(1);
  
  readonly displayedColumns: string[] = [
    'solutionCenterCode',
    'solutionCenterName',
    'solutionCenterTypeName',
    'isActive',
    'actions',
  ];

  ngOnInit(): void {
    this.loadSolutionCenters();
  }

  loadSolutionCenters(page = this.page(), take = this.take()): void {
    const user = this.sessionService.getUser();

    if (!user) {
      this.responseModalService.show('error', 'Error al cargar', 'No fue posible obtener la información del usuario autenticado.');
      return;
    }

    const role = user.nameRole;

    if (!role) {
      this.responseModalService.show('error', 'Error al cargar', 'No fue posible identificar el rol del usuario autenticado.');
      return;
    }

    this.loading.set(true);

    this.solutionCenterService.getAll(role, page, take)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.solutionCenters.set([]);
            this.total.set(0);
            this.pages.set(0);

            this.responseModalService.show('error', 'Error al cargar centros de solución', response.message || 'No fue posible consultar los centros de solución.');
            return;
          }

          this.solutionCenters.set(response.result.items ?? []);
          this.total.set(response.result.total ?? 0);
          this.pages.set(response.result.pages ?? 0);
          this.page.set(response.result.page);
          this.take.set(response.result.take);
        },

        error: (error) => {
          this.solutionCenters.set([]);
          this.total.set(0);
          this.pages.set(0);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los centros de solución.';

          this.responseModalService.show('error', 'Error al cargar centros de solución', message);
        },
      });
  }

  changePageSize(take: number): void {
    this.take.set(take);
    this.page.set(1);
    this.loadSolutionCenters(1, take);
  }

  previousPage(): void {

    if (this.page() <= 1) {
      return;
    }

    const previousPage = this.page() - 1;

    this.page.set(previousPage);
    this.loadSolutionCenters(previousPage, this.take());
  }

  nextPage(): void {

    if (this.page() >= this.pages()) {
      return;
    }

    const nextPage = this.page() + 1;

    this.page.set(nextPage);
    this.loadSolutionCenters(nextPage, this.take());
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

  updateStatus(solutionCenter: SolutionCenter): void {

    if (this.updatingStatusId() !== null) {
      return;
    }

    const newStatus = !solutionCenter.isActive;

    this.updatingStatusId.set(solutionCenter.solutionCenterId);
    this.solutionCenterService
      .updateStatus(solutionCenter.solutionCenterId,
        {
          isActive: newStatus,
        }
      )
      .pipe(
        finalize(() => {
          this.updatingStatusId.set(null);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo actualizar', response.message || 'No fue posible actualizar el estado del centro de solución.');
            return;
          }

          this.responseModalService.show('success', 'Estado actualizado', response.message);
          this.loadSolutionCenters(this.page(), this.take());
        },

        error: (error) => {

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al actualizar el estado del centro de solución.';

          this.responseModalService.show('error', 'Error al actualizar', message);
        },
      });
  }

  openViewModal(solutionCenter: SolutionCenter): void {
    this.solutionCenterDetail.set(null);
    this.loadingDetail.set(true);

    this.viewDialogRef = this.dialog.open(
      this.viewSolutionCenterModal,
      {
        width: '920px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        autoFocus: false,
        restoreFocus: false,
      }
    );

    this.solutionCenterService
      .getById(solutionCenter.solutionCenterId)
      .pipe(
        finalize(() => {
          this.loadingDetail.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.closeViewModal();
            this.responseModalService.show('error', 'Error al consultar', response.message || 'No fue posible consultar el centro de solución.');
            return;
          }

          this.solutionCenterDetail.set(response.result);
        },

        error: (error) => {
          this.closeViewModal();

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar el centro de solución.';

          this.responseModalService.show('error', 'Error al consultar', message);
        },
      });
  }

  closeViewModal(): void {
    this.viewDialogRef?.close();
    this.viewDialogRef = null;
    this.solutionCenterDetail.set(null);
    this.loadingDetail.set(false);
  }
}