export interface ApiResponse<T> {
  data: T;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  q: string;
}

export interface ApiPage<T> extends ApiResponse<T[]> {
  meta: PageMeta;
}
