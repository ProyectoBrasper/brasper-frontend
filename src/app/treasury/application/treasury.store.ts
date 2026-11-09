import { inject, Injectable, signal } from '@angular/core';
import { BankAccount } from '../domain/model/bank-account.entity';
import { Partner } from '../domain/model/partner.entity';
import { TreasuryApi } from '../infrastructure/treasury-api';

/**
 * Treasury context state. For now only the bank accounts and partners used by other contexts;
 * payables and loans come with their screens.
 */
@Injectable({ providedIn: 'root' })
export class TreasuryStore {
  private readonly treasuryApi = inject(TreasuryApi);

  private readonly bankAccountsSignal = signal<BankAccount[]>([]);
  private readonly partnersSignal = signal<Partner[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly bankAccounts = this.bankAccountsSignal.asReadonly();
  readonly partners = this.partnersSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  loadBankAccounts(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.treasuryApi.getBankAccounts().subscribe({
      next: (accounts) => {
        this.bankAccountsSignal.set(accounts);
        this.loadingSignal.set(false);
      },
      error: (error: unknown) => {
        this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load bank accounts');
        this.loadingSignal.set(false);
      },
    });
  }

  loadPartners(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.treasuryApi.getPartners().subscribe({
      next: (partners) => {
        this.partnersSignal.set(partners);
        this.loadingSignal.set(false);
      },
      error: (error: unknown) => {
        this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load partners');
        this.loadingSignal.set(false);
      },
    });
  }

  getBankAccountById(id: number | null): BankAccount | undefined {
    return id === null ? undefined : this.bankAccountsSignal().find((account) => account.id === id);
  }

  getPartnerById(id: number | null): Partner | undefined {
    return id === null ? undefined : this.partnersSignal().find((partner) => partner.id === id);
  }
}
