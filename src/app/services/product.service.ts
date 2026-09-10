import { Product, ProductSyncResult, ProductSearchResult } from '../models/product.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/pagination.model';
import { inject, Injectable } from '@angular/core';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class ProductService {

  private readonly http = inject(HttpClient);

  getAll(page: number, take: number, search?: string): Observable<ApiResponse<PagedResult<Product>>> {
    let params = new HttpParams()
      .set('page', page)
      .set('take', take);

    const cleanSearch = search?.trim();

    if (cleanSearch) {
      params = params.set('search', cleanSearch);
    }

    return this.http.get<ApiResponse<PagedResult<Product>>>(`${apiConfig.inventoryBaseUrl}/Product`, { params });
  }

  searchProduct(search: string, take: number = 20): Observable<ApiResponse<ProductSearchResult[]>> {
    const params = new HttpParams()
      .set('search', search.trim())
      .set('take', take);

    return this.http.get<ApiResponse<ProductSearchResult[]>>(`${apiConfig.inventoryBaseUrl}/Product/search`, { params });
  }

  syncProducts(): Observable<ApiResponse<ProductSyncResult>> {
    return this.http.post<ApiResponse<ProductSyncResult>>(`${apiConfig.inventoryBaseUrl}/Product/sync`, {});
  }
}
