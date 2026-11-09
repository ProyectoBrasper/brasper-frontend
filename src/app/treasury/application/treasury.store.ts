import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { BankAccount } from '../domain/model/bank-account.entity';
import { OpenBankAccountCommand } from '../domain/model/open-bank-account.command';
import { Partner } from '../domain/model/partner.entity';
import { TreasuryApi } from '../infrastructure/treasury-api';

/**
 * Treasury context state: bank accounts (also read by Billing, Expenses and Staff) and partners.
 * Movements, payables, loans and contributions come with their screens.
 */
@Injectable({ providedIn: 'root' })
export class TreasuryStore {
  private readonly treasuryApi = inject(TreasuryApi);
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  private readonly bankAccountsSignal = signal<BankAccount[]>([]);
  private readonly partnersSignal = signal<Partner[]>([]);
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  readonly bankAccounts = this.bankAccountsSignal.asReadonly();
  readonly partners = this.partnersSignal.asReadonly();
  /** Cash of the company in PEN: sum of the current balances of the PEN accounts (in cents, no drift). */
  readonly totalBalance = computed(
    () =>
      this.bankAccountsSignal()
        .filter((account) => account.currency === 'PEN')
        .reduce((sum, account) => sum + Math.round(account.currentBalance * 100), 0) / 100,
  );
  readonly loading = computed(() => this.pendingSignal() > 0);
  readonly error = this.errorSignal.asReadonly();
  /** Admin and accounting write; management only reads (backend rule). */
  readonly canWrite = computed(() => this.iamStore.hasAnyRole(...AREA_ROLES.treasuryWrite));

  loadBankAccounts(): void {
    this.run(this.treasuryApi.getBankAccounts(), 'Failed to load bank accounts', (accounts) =>
      this.bankAccountsSignal.set(accounts),
    );
  }

  /** Opens an account and navigates to `navigateTo` when the API accepts it. */
  openBankAccount(command: OpenBankAccountCommand, navigateTo: string[]): void {
    this.run(this.treasuryApi.openBankAccount(command), 'Failed to open bank account', (account) => {
      this.bankAccountsSignal.update((accounts) => [...accounts, account]);
      void this.router.navigate(navigateTo);
    });
  }

  loadPartners(): void {
    this.run(this.treasuryApi.getPartners(), 'Failed to load partners', (partners) =>
      this.partnersSignal.set(partners),
    );
  }

  getBankAccountById(id: number | null): BankAccount | undefined {
    return id === null ? undefined : this.bankAccountsSignal().find((account) => account.id === id);
  }

  getPartnerById(id: number | null): Partner | undefined {
    return id === null ? undefined : this.partnersSignal().find((partner) => partner.id === id);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private run<T>(request: Observable<T>, fallback: string, onSuccess: (value: T) => void): void {
    this.pendingSignal.update((pending) => pending + 1);
    this.errorSignal.set(null);
    request.subscribe({
      next: (value) => {
        onSuccess(value);
        this.pendingSignal.update((pending) => pending - 1);
      },
      error: (error: unknown) => {
        this.errorSignal.set(error instanceof Error ? error.message : fallback);
        this.pendingSignal.update((pending) => pending - 1);
      },
    });
  }
}
