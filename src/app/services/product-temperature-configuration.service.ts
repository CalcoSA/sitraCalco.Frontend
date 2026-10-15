import { CreateProductTemperatureConfiguration, UpdateProductTemperatureConfiguration } from '../models/product-temperature-configuration.model';
import { ApiResponse } from '../models/api-response.model';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class ProductTemperatureConfigurationService {

  private readonly http = inject(HttpClient);

  create(configuration: CreateProductTemperatureConfiguration): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${apiConfig.kitchenTraceabilityBaseUrl}/ProductTemperatureConfiguration`, configuration);
  }

  update(id: number, configuration: UpdateProductTemperatureConfiguration): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${apiConfig.kitchenTraceabilityBaseUrl}/ProductTemperatureConfiguration/${id}`, configuration);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${apiConfig.kitchenTraceabilityBaseUrl}/ProductTemperatureConfiguration/${id}`);
  }
}