import { WordpressUser } from '../models/wordpress-user.model';
import { ApiResponse } from '../models/api-response.model';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { apiConfig } from '../config/api.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class WordpressUserService {

  private readonly http = inject(HttpClient);

  getWordpressUser(userLogin: string): Observable<ApiResponse<WordpressUser>> {
    return this.http.get<ApiResponse<WordpressUser>>(`${apiConfig.authBaseUrl}/WordpressUser/${userLogin}`);
  }
}