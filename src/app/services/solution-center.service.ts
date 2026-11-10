import { EMPTY, expand, map, Observable, reduce, } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/pagination.model';
import { inject, Injectable } from '@angular/core';
import { apiConfig } from '../config/api.config';
import {
  SolutionCenter,
  SolutionCenterType,
  SolutionCenterCreate,
  SolutionCenterCreateResult,
  SectionConfigurationCreate,
  SectionConfigurationCreateResult,
  SolutionCenterDetail,
  SolutionCenterStatusUpdate,
  SolutionCenterUpdate,
  SolutionCenterUpdateResult,
  SolutionCenterSectionAssignmentResult,
  SolutionCenterSectionStatusUpdate,
  SolutionCenterProductOrderUpdate,
  SolutionCenterProductOrderUpdateResult,
  SolutionCenterSectionProductAdd,
  SolutionCenterSectionProductAddResult,
  SolutionCenterSectionProductDeleteResult,
  SolutionCenterSectionRemoveResult
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

  getAllForInventory(role: string, take = 50): Observable<SolutionCenter[]> {
    return this.getAll(role, 1, take)
      .pipe(
        expand(response => {
          if (!response.isSuccess || !response.result || response.result.page >= response.result.pages) {
            return EMPTY;
          }

          return this.getAll(role, response.result.page + 1, take);
        }),

        map(response =>
          response.isSuccess && response.result
            ? response.result.items ?? []
            : []
        ),

        reduce(
          (all, currentPage) => [
            ...all,
            ...currentPage,
          ],
          [] as SolutionCenter[]
        )
      );
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

  update(solutionCenterId: number, data: SolutionCenterUpdate): Observable<ApiResponse<SolutionCenterUpdateResult>> {
    return this.http.patch<ApiResponse<SolutionCenterUpdateResult>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter/${solutionCenterId}`, data);
  }

  assignSection(solutionCenterId: number, sectionId: number): Observable<ApiResponse<SolutionCenterSectionAssignmentResult>> {
    return this.http.post<ApiResponse<SolutionCenterSectionAssignmentResult>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter/${solutionCenterId}/sections/${sectionId}/assign`, {});
  }

  updateSectionAssignmentStatus(solutionCenterId: number, sectionId: number, data: SolutionCenterSectionStatusUpdate): Observable<ApiResponse<SolutionCenterSectionAssignmentResult>> {
    return this.http.patch<ApiResponse<SolutionCenterSectionAssignmentResult>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter/${solutionCenterId}/sections/${sectionId}/status`, data);
  }

  updateProductOrder(solutionCenterId: number, sectionId: number, solutionCenterProductId: number, data: SolutionCenterProductOrderUpdate): Observable<ApiResponse<SolutionCenterProductOrderUpdateResult>> {
    return this.http.patch<ApiResponse<SolutionCenterProductOrderUpdateResult>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter/${solutionCenterId}/sections/${sectionId}/products/${solutionCenterProductId}/order`, data);
  }

  addProductToSection(solutionCenterId: number, sectionId: number, data: SolutionCenterSectionProductAdd): Observable<ApiResponse<SolutionCenterSectionProductAddResult>> {
    return this.http.post<ApiResponse<SolutionCenterSectionProductAddResult>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter/${solutionCenterId}/sections/${sectionId}/products`, data);
  }

  removeProductFromSection(solutionCenterId: number, sectionId: number, solutionCenterProductId: number): Observable<ApiResponse<SolutionCenterSectionProductDeleteResult>> {
    return this.http.delete<ApiResponse<SolutionCenterSectionProductDeleteResult>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter/${solutionCenterId}/sections/${sectionId}/products/${solutionCenterProductId}`);
  }

  removeSection(solutionCenterId: number, sectionId: number): Observable<ApiResponse<SolutionCenterSectionRemoveResult>> {
    return this.http.delete<ApiResponse<SolutionCenterSectionRemoveResult>>(`${apiConfig.inventoryBaseUrl}/SolutionCenter/${solutionCenterId}/sections/${sectionId}`);
  }
}