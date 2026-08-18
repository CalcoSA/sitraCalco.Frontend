export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  take: number;
  pages: number;
}