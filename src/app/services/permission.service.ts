import { Permission, PermissionCreate, PermissionCreateResult, PermissionUpdate, PermissionUpdateResult, } from '../models/permission.model';
import { ApiResponse } from '../models/api-response.model';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class PermissionService {

  private readonly http = inject(HttpClient);

  getAll(): Observable<ApiResponse<Permission[]>> {
    return this.http.get<ApiResponse<Permission[]>>(`${apiConfig.inventoryBaseUrl}/Permission`);
  }

  create(data: PermissionCreate): Observable<ApiResponse<PermissionCreateResult>> {
    return this.http.post<ApiResponse<PermissionCreateResult>>(`${apiConfig.inventoryBaseUrl}/Permission`, data);
  }

  update(permissionId: number, data: PermissionUpdate): Observable<ApiResponse<PermissionUpdateResult>> {
    return this.http.put<ApiResponse<PermissionUpdateResult>>(`${apiConfig.inventoryBaseUrl}/Permission/${permissionId}`, data);
  }
}