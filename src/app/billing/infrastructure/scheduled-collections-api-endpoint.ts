import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { ScheduledCollection, ScheduleStatus } from '../domain/model/scheduled-collection.entity';

/** Backend `ScheduledCollectionResource`. */
export interface ScheduledCollectionResource extends BaseResource {
  projectId: number;
  expectedAmount: number;
  currency: string;
  year: number;
  month: number;
  week: number;
  status: string;
  invoiceId: number | null;
  notes: string | null;
}

/** Body of `POST /scheduled-collections` (backend `ScheduleCollectionResource`): the week comes from `expectedOn`. */
export interface ScheduleCollectionRequest {
  projectId: number;
  expectedAmount: number;
  currency: string;
  expectedOn: string;
  notes: string | null;
}

/** Maps scheduled collections from their resource. */
export class ScheduledCollectionAssembler {
  toEntityFromResource(resource: ScheduledCollectionResource): ScheduledCollection {
    return new ScheduledCollection({
      id: resource.id,
      projectId: resource.projectId,
      expectedAmount: Number(resource.expectedAmount),
      currency: resource.currency,
      year: resource.year,
      month: resource.month,
      week: resource.week,
      status: resource.status as ScheduleStatus,
      invoiceId: resource.invoiceId ?? null,
      notes: resource.notes ?? '',
    });
  }
}

/**
 * Client for `/scheduled-collections`: list by month (`?year=&month=`, both required), schedule,
 * `POST /{id}/reschedule {expectedOn}` and `POST /{id}/cancel`.
 */
export class ScheduledCollectionsApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly endpointUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderScheduledCollectionsEndpointPath}`;
  private readonly assembler = new ScheduledCollectionAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  getByPeriod(year: number, month: number): Observable<ScheduledCollection[]> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<ScheduledCollectionResource[]>(this.endpointUrl, { params }).pipe(
      map((resources) => resources.map((resource) => this.assembler.toEntityFromResource(resource))),
      catchError(this.handleError('Failed to fetch scheduled collections')),
    );
  }

  schedule(request: ScheduleCollectionRequest): Observable<ScheduledCollection> {
    return this.http.post<ScheduledCollectionResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to schedule collection')),
    );
  }

  reschedule(id: number, expectedOn: string): Observable<ScheduledCollection> {
    return this.http.post<ScheduledCollectionResource>(`${this.endpointUrl}/${id}/reschedule`, { expectedOn }).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to reschedule collection')),
    );
  }

  cancel(id: number): Observable<ScheduledCollection> {
    return this.http.post<ScheduledCollectionResource>(`${this.endpointUrl}/${id}/cancel`, {}).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to cancel collection')),
    );
  }
}
