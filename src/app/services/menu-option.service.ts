import { ApiResponse } from '../models/api-response.model';
import { MenuOption } from '../models/menu-option.model';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class MenuOptionService {

  private readonly http = inject(HttpClient);

  getAll(): Observable<ApiResponse<MenuOption[]>> {
    return this.http.get<ApiResponse<MenuOption[]>>(`${apiConfig.authBaseUrl}/MenuOption`);
  }

  getByRole(idRole: number): Observable<ApiResponse<MenuOption[]>> {
    return this.http.get<ApiResponse<MenuOption[]>>(`${apiConfig.authBaseUrl}/MenuOption/role/${idRole}`);
  }
}