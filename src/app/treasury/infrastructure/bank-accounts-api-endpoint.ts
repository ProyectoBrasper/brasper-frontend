import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BankAccount, BankAccountType } from '../domain/model/bank-account.entity';
import { RegisterAdjustmentCommand, TransferFundsCommand } from '../domain/model/cash-movement.commands';
import { CashMovement } from '../domain/model/cash-movement.entity';
import { OpenBankAccountCommand } from '../domain/model/open-bank-account.command';
import {
  CashMovementAssembler,
  CashMovementResource,
  RegisterAdjustmentRequest,
  TransferFundsRequest,
} from './cash-movement-assembler';

/** Body of `POST /bank-accounts` (backend `OpenBankAccountResource`). */
export interface OpenBankAccountRequest {
  bank: string;
  accountNumber: string;
  type: string;
  currency: string;
  openingBalance: number;
  openedOn: string;
}

/** Backend `BankAccountResource`. */
export interface BankAccountResource extends BaseResource {
  bank: string;
  accountNumber: string;
  type: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
}

/** Envelope for a bank account collection (the API returns a plain array). */
export interface BankAccountsResponse extends BaseResponse {
  bankAccounts: BankAccountResource[];
}

/** Maps bank accounts from their resource (they are opened with their own form, later). */
export class BankAccountAssembler implements BaseAssembler<BankAccount, BankAccountResource, BankAccountsResponse> {
  toEntitiesFromResponse(response: BankAccountsResponse): BankAccount[] {
    return response.bankAccounts.map((resource) => this.toEntityFromResource(resource));
  }

  toEntityFromResource(resource: BankAccountResource): BankAccount {
    return new BankAccount({
      id: resource.id,
      bank: resource.bank,
      accountNumber: resource.accountNumber,
      type: resource.type as BankAccountType,
      currency: resource.currency,
      openingBalance: Number(resource.openingBalance),
      currentBalance: Number(resource.currentBalance),
    });
  }

  toResourceFromEntity(entity: BankAccount): BankAccountResource {
    return {
      id: entity.id,
      bank: entity.bank,
      accountNumber: entity.accountNumber,
      type: entity.type,
      currency: entity.currency,
      openingBalance: entity.openingBalance,
      currentBalance: entity.currentBalance,
    };
  }
}

/**
 * Client for `/bank-accounts`: admin, accounting and management read; admin and accounting open accounts,
 * register adjustments and transfer funds. Movements are read per month (`?year=&month=`, both required).
 */
export class BankAccountsApiEndpoint extends BaseApiEndpoint<
  BankAccount,
  BankAccountResource,
  BankAccountsResponse,
  BankAccountAssembler
> {
  private readonly movementAssembler = new CashMovementAssembler();

  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderBankAccountsEndpointPath}`,
      new BankAccountAssembler(),
    );
  }

  /** `POST /bank-accounts` (admin and accounting): the backend answers with the account and its balance. */
  open(command: OpenBankAccountCommand): Observable<BankAccount> {
    const request: OpenBankAccountRequest = {
      bank: command.bank,
      accountNumber: command.accountNumber.trim(),
      type: command.type,
      currency: command.currency,
      openingBalance: command.openingBalance,
      openedOn: command.openedOn,
    };
    return this.http.post<BankAccountResource>(this.endpointUrl, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to open bank account')),
    );
  }

  /** `GET /bank-accounts/{id}/movements?year=&month=`; 404 if the account does not exist. */
  getMovements(id: number, year: number, month: number): Observable<CashMovement[]> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<CashMovementResource[]>(`${this.endpointUrl}/${id}/movements`, { params }).pipe(
      map((resources) => resources.map((resource) => this.movementAssembler.toEntityFromResource(resource))),
      catchError(this.handleError('Failed to fetch movements')),
    );
  }

  /** `POST /bank-accounts/{id}/adjustments`: answers with the account and its new balance. */
  adjust(id: number, command: RegisterAdjustmentCommand): Observable<BankAccount> {
    const request: RegisterAdjustmentRequest = {
      occurredOn: command.occurredOn,
      direction: command.direction,
      amount: command.amount,
      concept: command.concept.trim() || null,
    };
    return this.http.post<BankAccountResource>(`${this.endpointUrl}/${id}/adjustments`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to register adjustment')),
    );
  }

  /** `POST /bank-accounts/transfers`: answers with the origin account (the destination changes too). */
  transfer(command: TransferFundsCommand): Observable<BankAccount> {
    const request: TransferFundsRequest = {
      fromAccountId: command.fromAccountId,
      toAccountId: command.toAccountId,
      transferredOn: command.transferredOn,
      amount: command.amount,
      concept: command.concept.trim() || null,
    };
    return this.http.post<BankAccountResource>(`${this.endpointUrl}/transfers`, request).pipe(
      map((resource) => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError('Failed to transfer funds')),
    );
  }
}
