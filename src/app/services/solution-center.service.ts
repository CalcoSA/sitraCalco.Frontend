import { SolutionCenter, SolutionCenterType, SolutionCenterCreate, SolutionCenterCreateResult } from '../models/solution-center.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/pagination.model';
import { inject, Injectable } from '@angular/core';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class SolutionCenterService {

  private readonly http = inject(HttpClient);

  getAll(role: string, page: number, take: number): Observable<ApiResponse<PagedResult<SolutionCenter>>> {
    const params = new HttpParams()
      .set('role', role)
      .set('page', page)
      .set('take', take);

    return this.http.get<ApiResponse<PagedResult<SolutionCenter>>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter`, { params });
  }

  getTypes(): Observable<ApiResponse<SolutionCenterType[]>> {
    return this.http.get<ApiResponse<SolutionCenterType[]>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter/types`);
  }

  create(data: SolutionCenterCreate): Observable<ApiResponse<SolutionCenterCreateResult>> {
    return this.http.post<ApiResponse<SolutionCenterCreateResult>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter`, data);
  }
}