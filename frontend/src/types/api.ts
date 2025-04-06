/**
 * Common API response type
 */
export interface ApiResponse<T = any> {
  status?: number;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Success API response
 */
export interface ApiSuccessResponse<T = any> extends ApiResponse<T> {
  status: number;
  data: T;
  message?: string;
}

/**
 * Error API response
 */
export interface ApiErrorResponse extends ApiResponse {
  status: number;
  error: string;
} 