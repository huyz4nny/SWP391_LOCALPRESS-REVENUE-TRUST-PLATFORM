export interface FieldError {
  field: string
  message: string
}

export interface ApiErrorResponse {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors?: Record<string, string>
}

export class AppApiError extends Error {
  public status: number
  public error: string
  public path: string
  public fieldErrors?: Record<string, string>

  constructor(response: ApiErrorResponse) {
    super(response.message || 'Lỗi xử lý yêu cầu máy chủ')
    this.name = 'AppApiError'
    this.status = response.status
    this.error = response.error
    this.path = response.path
    this.fieldErrors = response.fieldErrors
  }
}
