import { ReceptionType, CreateReceptionType, UpdateReceptionType } from '../models/reception-type.model';
import { KitchenPagedResult } from '../models/kitchen-pagination.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';
import { inject, Injectable } from '@angular/core';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class ReceptionTypeService {

  private readonly http = inject(HttpClient);

  getAll(page: number, take: number, search?: string): Observable<ApiResponse<KitchenPagedResult<ReceptionType>>> {
    let params = new HttpParams()
      .set('Page', page)
      .set('Take', take);

    const cleanSearch = search?.trim();

    if (cleanSearch) {
      params = params.set('search', cleanSearch);
    }

    return this.http.get<ApiResponse<KitchenPagedResult<ReceptionType>>>(`${apiConfig.kitchenTraceabilityBaseUrl}/ReceptionType`, { params });
  }

  getOptions(search?: string): Observable<ApiResponse<ReceptionType[]>> {
    let params = new HttpParams();

    const cleanSearch = search?.trim();

    if (cleanSearch) {
      params = params.set('search', cleanSearch);
    }

    return this.http.get<ApiResponse<ReceptionType[]>>(`${apiConfig.kitchenTraceabilityBaseUrl}/ReceptionType/options`, { params });
  }

  create(receptionType: CreateReceptionType): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${apiConfig.kitchenTraceabilityBaseUrl}/ReceptionType`, receptionType);
  }

  update(receptionTypeId: number, receptionType: UpdateReceptionType): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${apiConfig.kitchenTraceabilityBaseUrl}/ReceptionType/${receptionTypeId}`, receptionType);
  }
}