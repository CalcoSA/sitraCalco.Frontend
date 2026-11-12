import { KitchenProduct, KitchenProductSyncResult } from '../models/kitchen-product.model';
import { KitchenPagedResult } from '../models/kitchen-pagination.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';
import { inject, Injectable } from '@angular/core';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class KitchenProductService {

  private readonly http = inject(HttpClient);

  getAll(page: number, take: number, search?: string): Observable<ApiResponse<KitchenPagedResult<KitchenProduct>>> {
    let params = new HttpParams()
      .set('Page', page)
      .set('Take', take);

    const cleanSearch = search?.trim();

    if (cleanSearch) {
      params = params.set('search', cleanSearch);
    }

    return this.http.get<ApiResponse<KitchenPagedResult<KitchenProduct>>>(`${apiConfig.kitchenTraceabilityBaseUrl}/Product`, { params });
  }

  getOptions(search?: string): Observable<ApiResponse<KitchenProduct[]>> {
    let params = new HttpParams();

    const cleanSearch = search?.trim();

    if (cleanSearch) {
      params = params.set('search', cleanSearch);
    }

    return this.http.get<ApiResponse<KitchenProduct[]>>(`${apiConfig.kitchenTraceabilityBaseUrl}/Product/options`, { params });
  }


  syncProducts(): Observable<ApiResponse<KitchenProductSyncResult>> {
    return this.http.post<ApiResponse<KitchenProductSyncResult>>(`${apiConfig.kitchenTraceabilityBaseUrl}/Product/siesa`, {});
  }
}