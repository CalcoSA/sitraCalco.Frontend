import { PagedResult } from './pagination.model';

export interface Log {
  logId: number;
  action: string;
  module: string;
  description: string;
  userName: string;
  createdAt: string;
}

export interface LogResponse {
  isSuccess: boolean;
  message: string;
  result: PagedResult<Log> | null;
}