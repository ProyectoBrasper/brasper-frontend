import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

/**
 * Error body returned by the backend (RFC 9457 `ProblemDetail`). Its `detail` is already localized.
 */
interface ProblemDetail {
  title?: string;
  detail?: string;
  status?: number;
}

/**
 * Base for API clients: turns HTTP failures into an `Error` whose message can be shown to the user.
 */
export abstract class ErrorHandlingEnabledBaseType {
  /**
   * Builds an error handler for `catchError`.
   * @param operation - What was being attempted, used when the server gives no detail.
   * @returns Function that maps an `HttpErrorResponse` into a failed observable.
   */
  protected handleError(operation: string): (error: HttpErrorResponse) => Observable<never> {
    return (error: HttpErrorResponse) => throwError(() => new Error(this.messageFor(operation, error)));
  }

  private messageFor(operation: string, error: HttpErrorResponse): string {
    if (error.status === 0) {
      return `${operation}: server unreachable`;
    }
    const problem = error.error as ProblemDetail | null;
    if (problem && typeof problem === 'object' && (problem.detail || problem.title)) {
      return problem.detail ?? problem.title ?? operation;
    }
    if (error.status === 404) {
      return `${operation}: resource not found`;
    }
    return `${operation}: ${error.statusText || 'unexpected error'}`;
  }
}
