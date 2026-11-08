import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { BaseResponse } from '../../shared/infrastructure/base-response';
import { BankAccount, BankAccountType } from '../domain/model/bank-account.entity';

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
 * Client for `/bank-accounts` (read by any signed-in user). Transfers, adjustments and movements
 * come with the treasury screens.
 */
export class BankAccountsApiEndpoint extends BaseApiEndpoint<
  BankAccount,
  BankAccountResource,
  BankAccountsResponse,
  BankAccountAssembler
> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.platformProviderApiBaseUrl}${environment.platformProviderBankAccountsEndpointPath}`,
      new BankAccountAssembler(),
    );
  }
}
