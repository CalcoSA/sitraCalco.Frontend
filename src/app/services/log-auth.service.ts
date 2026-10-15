import { LogResponse } from '../models/log-authentication.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class LogAuthService {

  private readonly http = inject(HttpClient);

  getAll(page: number, take: number, from?: string, to?: string): Observable<LogResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('take', take);

    if (from) {
      params = params.set('from', from);
    }

    if (to) {
      params = params.set('to', to);
    }

    return this.http.get<LogResponse>(`${apiConfig.authBaseUrl}/Log`, { params });
  }
}