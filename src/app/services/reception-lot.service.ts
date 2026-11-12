import { CreateReceptionLot, CreateReceptionLotResult, CreateReceptionLotEvaluation, CreateReceptionLotEvaluationResult } from '../models/reception-lot.model';
import { ApiResponse } from '../models/api-response.model';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class ReceptionLotService {

  private readonly http = inject(HttpClient);

  create(receptionLot: CreateReceptionLot): Observable<ApiResponse<CreateReceptionLotResult>> {
    return this.http.post<ApiResponse<CreateReceptionLotResult>>(`${apiConfig.kitchenTraceabilityBaseUrl}/ReceptionLot`, receptionLot);
  }

  createEvaluation(evaluation: CreateReceptionLotEvaluation): Observable<ApiResponse<CreateReceptionLotEvaluationResult>> {
    return this.http.post<ApiResponse<CreateReceptionLotEvaluationResult>>(`${apiConfig.kitchenTraceabilityBaseUrl}/ReceptionLot/evaluation`, evaluation);
  }
}