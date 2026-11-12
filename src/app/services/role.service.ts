import { Role, RoleDetail, RoleCreate, RoleUpdate } from '../models/role.model';
import { ApiResponse } from '../models/api-response.model';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class RoleService {

  private readonly http = inject(HttpClient);

  getAll(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(`${apiConfig.authBaseUrl}/Role`);
  }

  getById(idRole: number): Observable<ApiResponse<RoleDetail>> {
    return this.http.get<ApiResponse<RoleDetail>>(`${apiConfig.authBaseUrl}/Role/${idRole}`);
  }

  create(data: RoleCreate): Observable<ApiResponse<object>> {
    return this.http.post<ApiResponse<object>>(`${apiConfig.authBaseUrl}/Role`, data);
  }

  update(data: RoleUpdate): Observable<ApiResponse<object>> {
    return this.http.put<ApiResponse<object>>(`${apiConfig.authBaseUrl}/Role`, data);
  }
}