import { KitchenPagedResult } from '../models/kitchen-pagination.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';
import { Supplier } from '../models/supplier.model';
import { inject, Injectable } from '@angular/core';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class SupplierService {

  private readonly http = inject(HttpClient);

  getAll(page: number, take: number): Observable<ApiResponse<KitchenPagedResult<Supplier>>> {
    const params = new HttpParams()
      .set('Page', page)
      .set('Take', take);

    return this.http.get<ApiResponse<KitchenPagedResult<Supplier>>>(`${apiConfig.kitchenTraceabilityBaseUrl}/Supplier`, { params });
  }

  getOptions(search?: string): Observable<ApiResponse<Supplier[]>> {
    let params = new HttpParams();

    const cleanSearch = search?.trim();

    if (cleanSearch) {
      params = params.set('search', cleanSearch);
    }

    return this.http.get<ApiResponse<Supplier[]>>(`${apiConfig.kitchenTraceabilityBaseUrl}/Supplier/options`, { params });
  }
}