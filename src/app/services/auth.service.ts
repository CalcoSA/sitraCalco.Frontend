import { LoginRequest } from '../models/login-request.model';
import { ApiResponse } from '../models/api-response.model';
import { LoginResult } from '../models/login-result.model';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class AuthService {

  private readonly http = inject(HttpClient);

  login(data: LoginRequest): Observable<ApiResponse<LoginResult>> {
    return this.http.post<ApiResponse<LoginResult>>(`${apiConfig.authBaseUrl}/Auth/login`, data);
  }

  registerActivity(): Observable<ApiResponse<{ sessionExpiresAt: string }>> {
    return this.http.post<ApiResponse<{ sessionExpiresAt: string }>>(`${apiConfig.authBaseUrl}/Auth/activity`, { });
  }

  logout(): Observable<ApiResponse<object>> {
    return this.http.post<ApiResponse<object>>(`${apiConfig.authBaseUrl}/Auth/logout`, { });
  }
}