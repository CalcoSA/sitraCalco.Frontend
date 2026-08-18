import { ResponseModal } from '../common/response-modal/response-modal';
import { ResponseModalSeverity } from '../models/response-modal.model';
import { MatDialog } from '@angular/material/dialog';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class ResponseModalService {

  private readonly dialog = inject(MatDialog);

  show(severity: ResponseModalSeverity, title: string, message: string, buttonText = 'Aceptar'): void {
    this.dialog.open(ResponseModal, {
      width: '100%',
      maxWidth: '440px',
      disableClose: true,
      data: {
        severity,
        title,
        message,
        buttonText,
      },
    });
  }

  confirm(severity: ResponseModalSeverity, title: string, message: string, confirmButtonText = 'Confirmar'): Observable<boolean | undefined> {
    return this.dialog
      .open(ResponseModal, {
        width: '100%',
        maxWidth: '440px',
        disableClose: true,
        data: {
          severity,
          title,
          message,
          confirm: true,
          confirmButtonText,
        },
      })
      .afterClosed();
  }
}