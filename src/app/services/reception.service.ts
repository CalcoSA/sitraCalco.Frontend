import { CreateReception, CreateReceptionResult, } from '../models/reception.model';
import { ReceptionDetail } from '../models/reception.model';
import { ApiResponse } from '../models/api-response.model';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class ReceptionService {

  private readonly http = inject(HttpClient);

  getById(id: number): Observable<ApiResponse<ReceptionDetail>> {
    return this.http.get<ApiResponse<ReceptionDetail>>(`${apiConfig.kitchenTraceabilityBaseUrl}/Reception/${id}`);
  }

  create(reception: CreateReception): Observable<ApiResponse<CreateReceptionResult>> {
    return this.http.post<ApiResponse<CreateReceptionResult>>(`${apiConfig.kitchenTraceabilityBaseUrl}/Reception`, reception);
  }
}