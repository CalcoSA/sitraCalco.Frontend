import { MatNativeDateModule, MAT_DATE_LOCALE, MAT_DATE_FORMATS, DateAdapter, NativeDateAdapter, } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ResponseModalService } from '../../services/response-modal.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LogAuthService } from '../../services/log-auth.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Log } from '../../models/log-authentication.model';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';

const COLOMBIAN_DATE_FORMATS = {
  parse: {
    dateInput: 'dd/MM/yyyy',
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

class ColombianDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'dd/MM/yyyy') {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    }

    return super.format(date, displayFormat);
  }
}

@Component({
  selector: 'app-configuration-logs',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatButtonModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatMenuModule,
    DatePipe,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
    { provide: DateAdapter, useClass: ColombianDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: COLOMBIAN_DATE_FORMATS },
  ],
  templateUrl: './configuration-logs.html',
})

export class ConfigurationLogs implements OnInit {

  private readonly responseModalService = inject(ResponseModalService);
  private readonly logAuthService = inject(LogAuthService);
  private readonly formBuilder = inject(FormBuilder);
  readonly validationError = signal('');
  readonly logs = signal<Log[]>([]);
  readonly loading = signal(false);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly take = signal(10);
  readonly page = signal(1);
  private appliedFrom = '';
  private appliedTo = '';

  readonly displayedColumns: string[] = [
    'createdAt',
    'userName',
    'module',
    'action',
    'description',
  ];

  readonly filterForm = this.formBuilder.group({
    from: this.formBuilder.control<Date | null>(null),
    to: this.formBuilder.control<Date | null>(null),
  });

  ngOnInit(): void {
    this.loadLogs();
  }

  private formatDate(date: Date | null): string {

    if (!date) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  loadLogs(page = this.page(), take = this.take(), from = this.appliedFrom, to = this.appliedTo): void {
    this.loading.set(true);
    this.logAuthService
      .getAll(page, take, from, to)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.logs.set([]);
            this.total.set(0);
            this.pages.set(0);
            this.responseModalService.show('error', 'Error al cargar logs', response.message || 'No fue posible consultar los registros.');
            return;
          }

          this.logs.set(response.result.items ?? []);
          this.total.set(response.result.total ?? 0);
          this.pages.set(response.result.pages ?? 0);
          this.page.set(response.result.page);
          this.take.set(response.result.take);
        },

        error: (error) => {
          this.logs.set([]);
          this.total.set(0);
          this.pages.set(0);

          const message = error.status === 0
            ? 'No fue posible comunicarse con el servidor.'
            : error.error?.message || 'Ocurrió un error al consultar los registros.';

          this.responseModalService.show('error', 'Error al cargar logs', message);
        },
      });
  }

  searchLogs(): void {

    if (this.loading()) {
      return;
    }

    const { from, to } = this.filterForm.getRawValue();

    this.validationError.set('');

    if (from && to && from.getTime() > to.getTime()) {
      this.validationError.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    this.appliedFrom = this.formatDate(from);
    this.appliedTo = this.formatDate(to);
    this.page.set(1);
    this.loadLogs(1, this.take());
  }

  clearSearch(): void {

    if (this.loading()) {
      return;
    }

    this.filterForm.reset({
      from: null,
      to: null,
    });

    this.validationError.set('');
    this.appliedFrom = '';
    this.appliedTo = '';
    this.page.set(1);
    this.loadLogs(1, this.take());
  }

  changePageSize(take: number): void {

    if (this.loading()) {
      return;
    }

    this.take.set(take);
    this.page.set(1);
    this.loadLogs(1, take);
  }

  previousPage(): void {

    if (this.page() <= 1 || this.loading()) {
      return;
    }

    const previousPage = this.page() - 1;

    this.page.set(previousPage);
    this.loadLogs(previousPage, this.take());
  }

  nextPage(): void {

    if (this.page() >= this.pages() || this.loading()) {
      return;
    }

    const nextPage = this.page() + 1;

    this.page.set(nextPage);
    this.loadLogs(nextPage, this.take());
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
}