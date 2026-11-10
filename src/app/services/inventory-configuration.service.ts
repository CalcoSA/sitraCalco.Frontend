import { InventorySectionProduct } from '../models/inventory.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/pagination.model';
import { inject, Injectable } from '@angular/core';
import { apiConfig } from '../config/api.config';
import {
  InventoryConfigurationOption,
  SolutionCenterInventoryConfigurations,
  InventoryConfigurationCreate,
  InventoryConfigurationCreateResult,
  InventoryConfigurationDaysCreate,
  InventoryConfigurationDaysCreateResult,
  InventoryConfigurationListItem,
  InventoryConfigurationUpdate,
  InventoryConfigurationUpdateResult,
  InventoryConfigurationDayDeleteResult,
  InventoryConfigurationSolutionCenter,
  InventoryConfigurationAssignmentsCreate,
  InventoryConfigurationAssignmentsCreateResult,
  InventoryConfigurationAssignmentDeleteResult,
  InventoryConfigurationSectionDetail,
  InventoryConfigurationSolutionCenterDeleteResult,
  InventoryAvailableOption,
  InventoryAvailableSectionOption,
} from '../models/inventory-configuration.model';

@Injectable({
  providedIn: 'root',
})

export class InventoryConfigurationService {

  private readonly http = inject(HttpClient);

  getAll(page: number, take: number): Observable<ApiResponse<PagedResult<InventoryConfigurationListItem>>> {
    const params = new HttpParams()
      .set('page', page)
      .set('take', take);

    return this.http.get<ApiResponse<PagedResult<InventoryConfigurationListItem>>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration`, { params, });
  }

  getAllForAssignment(take = 20): Observable<InventoryConfigurationListItem[]> {
    return this.getAll(1, take)
      .pipe(
        
        expand(response => {

          if (!response.isSuccess || !response.result || response.result.page >= response.result.pages) {
            return EMPTY;
          }

          return this.getAll(response.result.page + 1, take);
        }),

        map(response => response.isSuccess && response.result ? response.result.items ?? [] : []),

        reduce(
          (allInventories, currentPage) => [
            ...allInventories,
            ...currentPage,
          ],
          [] as InventoryConfigurationListItem[]
        )
      );
  }

  getOptions(type: number): Observable<ApiResponse<InventoryConfigurationOption[]>> {
    const params = new HttpParams().set('type', type);
    return this.http.get<ApiResponse<InventoryConfigurationOption[]>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/options`, { params, });
  }

  getSolutionCenterConfigurations(solutionCenterId: number): Observable<ApiResponse<SolutionCenterInventoryConfigurations>> {
    return this.http.get<ApiResponse<SolutionCenterInventoryConfigurations>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/solution-center/${solutionCenterId}/configurations`);
  }

  getSolutionCenter(solutionCenterId: number): Observable<ApiResponse<InventoryConfigurationSolutionCenter>> {
    return this.http.get<ApiResponse<InventoryConfigurationSolutionCenter>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/solution-center/${solutionCenterId}`);
  }

  getSection(sectionId: number): Observable<ApiResponse<InventoryConfigurationSectionDetail>> {
    return this.http.get<ApiResponse<InventoryConfigurationSectionDetail>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/section/${sectionId}`);
  }

  getAvailableInventories(solutionCenterId: number): Observable<ApiResponse<InventoryAvailableOption[]>> {
    return this.http.get<ApiResponse<InventoryAvailableOption[]>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/solution-center/${solutionCenterId}/available`);
  }

  getAvailableSections(solutionCenterId: number, inventoryConfigurationId: number): Observable<ApiResponse<InventoryAvailableSectionOption[]>> {
    return this.http.get<ApiResponse<InventoryAvailableSectionOption[]>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/solution-center/${solutionCenterId}/configuration/${inventoryConfigurationId}/sections`);
  }

  getSectionProducts(solutionCenterId: number, inventoryConfigurationId: number, sectionId: number): Observable<ApiResponse<InventorySectionProduct[]>> {
    return this.http.get<ApiResponse<InventorySectionProduct[]>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/solution-center/${solutionCenterId}/configuration/${inventoryConfigurationId}/section/${sectionId}/products`);
  }

  getAllSectionProducts(solutionCenterId: number, inventoryConfigurationId: number, sectionId: number): Observable<InventorySectionProduct[]> {
    return this.getSectionProducts(
      solutionCenterId,
      inventoryConfigurationId,
      sectionId
    ).pipe(
      map(response =>
        response.isSuccess && response.result
          ? response.result
          : []
      )
    );
  }

  create(data: InventoryConfigurationCreate): Observable<ApiResponse<InventoryConfigurationCreateResult>> {
    return this.http.post<ApiResponse<InventoryConfigurationCreateResult>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration`, data);
  }

  addDays(inventoryConfigurationId: number, data: InventoryConfigurationDaysCreate): Observable<ApiResponse<InventoryConfigurationDaysCreateResult>> {
    return this.http.post<ApiResponse<InventoryConfigurationDaysCreateResult>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/${inventoryConfigurationId}/days`, data);
  }

  assignInventory(inventoryConfigurationId: number, data: InventoryConfigurationAssignmentsCreate): Observable<ApiResponse<InventoryConfigurationAssignmentsCreateResult>> {
    return this.http.post<ApiResponse<InventoryConfigurationAssignmentsCreateResult>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/${inventoryConfigurationId}/assignments`, data);
  }

  update(inventoryConfigurationId: number, data: InventoryConfigurationUpdate): Observable<ApiResponse<InventoryConfigurationUpdateResult>> {
    return this.http.patch<ApiResponse<InventoryConfigurationUpdateResult>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/${inventoryConfigurationId}`, data);
  }

  deleteDay(inventoryConfigurationId: number, day: string): Observable<ApiResponse<InventoryConfigurationDayDeleteResult>> {
    return this.http.delete<ApiResponse<InventoryConfigurationDayDeleteResult>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/${inventoryConfigurationId}/days/${encodeURIComponent(day)}`);
  }

  deleteAssignment(inventoryConfigurationId: number, solutionCenterId: number, sectionId: number): Observable<ApiResponse<InventoryConfigurationAssignmentDeleteResult>> {
    return this.http.delete<ApiResponse<InventoryConfigurationAssignmentDeleteResult>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/${inventoryConfigurationId}/solution-centers/${solutionCenterId}/sections/${sectionId}`);
  }

  deleteSolutionCenterConfiguration(inventoryConfigurationId: number, solutionCenterId: number): Observable<ApiResponse<InventoryConfigurationSolutionCenterDeleteResult>> {
    return this.http.delete<ApiResponse<InventoryConfigurationSolutionCenterDeleteResult>>(`${apiConfig.inventoryBaseUrl}/InventoryConfiguration/${inventoryConfigurationId}/solution-centers/${solutionCenterId}`);
  }
}