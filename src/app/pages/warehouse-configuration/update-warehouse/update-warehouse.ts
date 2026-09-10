import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Component, inject } from '@angular/core';

@Component({
  selector: 'app-update-warehouse',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './update-warehouse.html',
})

export class UpdateWarehouse {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly solutionCenterId = Number(this.route.snapshot.paramMap.get('solutionCenterId'));

  cancel(): void {
    this.router.navigateByUrl('/inventarios/configuracion-bodega');
  }
}