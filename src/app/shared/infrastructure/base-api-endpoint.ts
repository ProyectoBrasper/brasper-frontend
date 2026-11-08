import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseEntity } from '../domain/model/base-entity';
import { BaseAssembler } from './base-assembler';
import { BaseResource } from './base-resource';
import { BaseResponse } from './base-response';
import { ErrorHandlingEnabledBaseType } from './error-handling-enabled-base-type';

/**
 * Generic CRUD client for one REST collection (`/clients`, `/projects`, ...).
 * Specific endpoints extend it and add their own actions (start, cancel, void, ...).
 */
export abstract class BaseApiEndpoint<
  TEntity extends BaseEntity,
  TResource extends BaseResource,
  TResponse extends BaseResponse,
  TAssembler extends BaseAssembler<TEntity, TResource, TResponse>,
> extends ErrorHandlingEnabledBaseType {
  protected constructor(
    protected readonly http: HttpClient,
    protected readonly endpointUrl: string,
    protected readonly assembler: TAssembler,
  ) {
    super();
  }

  /** Fetches the whole collection. Accepts a plain array or a response envelope. */
  getAll(): Observable<TEntity[]> {
    return this.http.get<TResource[] | TResponse>(this.endpointUrl).pipe(
      map((response) => this.toEntities(response)),
      catchError(this.handleError('Failed to fetch entities')),
    );
  }

  /** Fetches one entity by id. */
  getById(id: number): Observable<TEntity> {
    return this.http.get<TResource>(`${this.endpointUrl}/${id}`).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to fetch entity')),
    );
  }

  /** Creates an entity. The id is left out: the backend assigns it. */
  create(entity: TEntity): Observable<TEntity> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...body } = this.assembler.toResourceFromEntity(entity);
    return this.http.post<TResource>(this.endpointUrl, body).pipe(
      map((created) => this.assembler.toEntityFromResource(created)),
      catchError(this.handleError('Failed to create entity')),
    );
  }

  /** Replaces an entity (PUT). */
  update(entity: TEntity, id: number): Observable<TEntity> {
    return this.http
      .put<TResource>(`${this.endpointUrl}/${id}`, this.assembler.toResourceFromEntity(entity))
      .pipe(
        map((updated) => this.assembler.toEntityFromResource(updated)),
        catchError(this.handleError('Failed to update entity')),
      );
  }

  /** Deletes an entity by id. */
  delete(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.endpointUrl}/${id}`)
      .pipe(catchError(this.handleError('Failed to delete entity')));
  }

  /** Maps a list response (array or envelope) to entities. Reusable by subclass queries. */
  protected toEntities(response: TResource[] | TResponse): TEntity[] {
    return Array.isArray(response)
      ? response.map((resource) => this.assembler.toEntityFromResource(resource))
      : this.assembler.toEntitiesFromResponse(response);
  }
}
