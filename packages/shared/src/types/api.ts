export interface ApiSuccessResponse<T> {
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  timestamp: string;
}
