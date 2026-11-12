export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  result: T | null;
}