import { InventoryCreate, InventorySaveResult, InventoryCountNumber, InventoryCountsResult, InventoryTodayExecutionResult, InventoryHistoryDay } from '../models/inventory.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';
import { inject, Injectable } from '@angular/core';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class InventoryService {

  private readonly http = inject(HttpClient);

  getCounts(inventoryExecutionId: string, countNumber?: InventoryCountNumber): Observable<ApiResponse<InventoryCountsResult>> {
    let params = new HttpParams();

    if (countNumber) {
      params = params.set('countNumber', countNumber);
    }

    return this.http.get<ApiResponse<InventoryCountsResult>>(`${apiConfig.inventoryBaseUrl}/Inventory/${inventoryExecutionId}/counts`, { params });
  }

  getTodayExecution(solutionCenterId: number, inventoryConfigurationId: number, sectionId: number): Observable<ApiResponse<InventoryTodayExecutionResult>> {
    const params = new HttpParams()
      .set('solutionCenterId', solutionCenterId.toString())
      .set('inventoryConfigurationId', inventoryConfigurationId.toString())
      .set('sectionId', sectionId.toString());

    return this.http.get<ApiResponse<InventoryTodayExecutionResult>>(`${apiConfig.inventoryBaseUrl}/Inventory/today-execution`, { params });
  }

  getHistory(from: string, to: string | null, solutionCenterId: number, inventoryConfigurationId: number, sectionId: number): Observable<ApiResponse<InventoryHistoryDay[]>> {
    let params = new HttpParams()
      .set('from', from)
      .set('solutionCenterId', solutionCenterId.toString())
      .set('inventoryConfigurationId', inventoryConfigurationId.toString())
      .set('sectionId', sectionId.toString());

    if (to) {
      params = params.set('to', to);
    }

    return this.http.get<ApiResponse<InventoryHistoryDay[]>>(`${apiConfig.inventoryBaseUrl}/Inventory/history`, { params, });
  }

  create(data: InventoryCreate): Observable<ApiResponse<InventorySaveResult>> {
    return this.http.post<ApiResponse<InventorySaveResult>>(`${apiConfig.inventoryBaseUrl}/Inventory`, data);
  }
}