import { User, UserCreate, UserUpdate } from '../models/user.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/pagination.model';
import { inject, Injectable } from '@angular/core';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class UserService {

  private readonly http = inject(HttpClient);

  getAll(page: number, take: number, search?: string): Observable<ApiResponse<PagedResult<User>>> {
    let params = new HttpParams()
      .set('page', page)
      .set('take', take);

    const cleanSearch = search?.trim();

    if (cleanSearch) {
      params = params.set('search', cleanSearch);
    }

    return this.http.get<ApiResponse<PagedResult<User>>>(`${apiConfig.authBaseUrl}/User`, { params });
  }

  create(data: UserCreate): Observable<ApiResponse<object>> {
    return this.http.post<ApiResponse<object>>(`${apiConfig.authBaseUrl}/User`, data);
  }

  update(data: UserUpdate): Observable<ApiResponse<object>> {
    return this.http.put<ApiResponse<object>>(`${apiConfig.authBaseUrl}/User`, data);
  }
}