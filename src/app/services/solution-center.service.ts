import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/pagination.model';
import { inject, Injectable } from '@angular/core';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';
import {
  SolutionCenter,
  SolutionCenterType,
  SolutionCenterCreate,
  SolutionCenterCreateResult,
  SectionConfigurationCreate,
  SectionConfigurationCreateResult,
  SolutionCenterDetail,
  SolutionCenterStatusUpdate
} from '../models/solution-center.model';

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

  getById(solutionCenterId: number): Observable<ApiResponse<SolutionCenterDetail>> {
    return this.http.get<ApiResponse<SolutionCenterDetail>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter/${solutionCenterId}`);
  }

  getTypes(): Observable<ApiResponse<SolutionCenterType[]>> {
    return this.http.get<ApiResponse<SolutionCenterType[]>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter/types`);
  }

  create(data: SolutionCenterCreate): Observable<ApiResponse<SolutionCenterCreateResult>> {
    return this.http.post<ApiResponse<SolutionCenterCreateResult>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter`, data);
  }

  createSection(solutionCenterId: number, data: SectionConfigurationCreate): Observable<ApiResponse<SectionConfigurationCreateResult>> {
    return this.http.post<ApiResponse<SectionConfigurationCreateResult>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter/${solutionCenterId}/sections`, data);
  }

  updateStatus(solutionCenterId: number, data: SolutionCenterStatusUpdate): Observable<ApiResponse<unknown>> {
    return this.http.patch<ApiResponse<unknown>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter/${solutionCenterId}/status`, data);
  }
}