import { ResponseModalData, ResponseModalSeverity, ModalConfig } from '../../models/response-modal.model';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Component, inject } from '@angular/core';

@Component({
  selector: 'app-response-modal',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './response-modal.html',
})

export class ResponseModal {

  private readonly dialogRef = inject(MatDialogRef<ResponseModal, boolean>);
  readonly data = inject<ResponseModalData>(MAT_DIALOG_DATA);

  private readonly modalConfig: Record<ResponseModalSeverity, ModalConfig> = {
    success: {
      icon: 'done',
      color: '#2E7D32',
      backgroundColor: '#E8F5E9',
    },
    error: {
      icon: 'close',
      color: '#C62828',
      backgroundColor: '#FFEBEE',
    },
    warning: {
      icon: 'warning_amber',
      color: '#ED6C02',
      backgroundColor: '#FFF4E5',
    },
    info: {
      icon: 'info_outline',
      color: '#0288D1',
      backgroundColor: '#E5F6FD',
    },
  };

  get config(): ModalConfig {
    return this.modalConfig[this.data.severity];
  }

  get isConfirmModal(): boolean {
    return this.data.confirm === true;
  }

  close(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}