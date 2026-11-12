import { CreateProductReceptionConfiguration, UpdateProductReceptionConfiguration } from '../models/product-reception-configuration.model';
import { ApiResponse } from '../models/api-response.model';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class ProductReceptionConfigurationService {

  private readonly http = inject(HttpClient);

  create(configuration: CreateProductReceptionConfiguration): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${apiConfig.kitchenTraceabilityBaseUrl}/ProductReceptionConfiguration`, configuration);
  }

  update(id: number, configuration: UpdateProductReceptionConfiguration): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${apiConfig.kitchenTraceabilityBaseUrl}/ProductReceptionConfiguration/${id}`, configuration);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${apiConfig.kitchenTraceabilityBaseUrl}/ProductReceptionConfiguration/${id}` );
  }
}