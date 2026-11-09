import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { CreateFixedCostCommand, UpdateFixedCostCommand } from '../domain/model/fixed-cost.commands';
import { FixedCost } from '../domain/model/fixed-cost.entity';
import { FixedCostAssembler } from './fixed-cost-assembler';
import {
  CreateFixedCostRequest,
  FixedCostResource,
  FixedCostsResponse,
  UpdateFixedCostRequest,
} from './fixed-cost.resource';

/**
 * Client for `/fixed-costs` (admin, accounting and management read; admin and accounting write): list
 * (`?active=` optional), get, `POST` creates, `PUT /{id}` changes concept, amount and weeks, and
 * `POST /{id}/deactivate` deactivates for good. Payments have their own endpoint.
 */
export class FixedCostsApiEndpoint extends BaseApiEndpoint<
  FixedCost,
  FixedCostResource,
  FixedCostsResponse,
  FixedCostAssembler
> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderFixedCostsEndpointPath}`,
      new FixedCostAssembler(),
    );
  }

  createFixedCost(command: CreateFixedCostCommand): Observable<FixedCost> {
    const request: CreateFixedCostRequest = {
      code: command.code.trim(),
      concept: command.concept.trim(),
      type: command.type,
      monthlyAmount: command.monthlyAmount,
      currency: command.currency,
      employeeId: command.employeeId,
      expectedWeeks: [...command.expectedWeeks].sort((a, b) => a - b),
    };
    return this.http.post<FixedCostResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to create fixed cost')),
    );
  }

  updateFixedCost(id: number, command: UpdateFixedCostCommand): Observable<FixedCost> {
    const request: UpdateFixedCostRequest = {
      concept: command.concept.trim(),
      monthlyAmount: command.monthlyAmount,
      expectedWeeks: [...command.expectedWeeks].sort((a, b) => a - b),
    };
    return this.http.put<FixedCostResource>(`${this.endpointUrl}/${id}`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to update fixed cost')),
    );
  }

  deactivate(id: number): Observable<FixedCost> {
    return this.http.post<FixedCostResource>(`${this.endpointUrl}/${id}/deactivate`, {}).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to deactivate fixed cost')),
    );
  }
}
