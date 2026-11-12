import { Section, SectionCreate, SectionCreateResult, SectionUpdate, SectionUpdateResult } from '../models/section.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';
import { inject, Injectable } from '@angular/core';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class SectionService {

  private readonly http = inject(HttpClient);

  getAll(solutionCenterTypeId?: number): Observable<ApiResponse<Section[]>> {
    let params = new HttpParams();

    if (solutionCenterTypeId && solutionCenterTypeId > 0) {
      params = params.set('solutionCenterTypeId', solutionCenterTypeId);
    }

    return this.http.get<ApiResponse<Section[]>>(`${apiConfig.inventoryBaseUrl}/Section`, { params, });
  }

  create(data: SectionCreate): Observable<ApiResponse<SectionCreateResult>> {
    return this.http.post<ApiResponse<SectionCreateResult>>(`${apiConfig.inventoryBaseUrl}/Section`, data);
  }

  update(sectionId: number, data: SectionUpdate): Observable<ApiResponse<SectionUpdateResult>> {
    return this.http.put<ApiResponse<SectionUpdateResult>>(`${apiConfig.inventoryBaseUrl}/Section/${sectionId}`, data);
  }
}