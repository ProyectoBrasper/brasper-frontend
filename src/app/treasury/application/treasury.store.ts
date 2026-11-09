import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { AREA_ROLES } from '../../iam/domain/model/role';
import { BankAccount } from '../domain/model/bank-account.entity';
import { Period } from '../../shared/domain/model/period';
import { RegisterAdjustmentCommand, TransferFundsCommand } from '../domain/model/cash-movement.commands';
import { CashMovement } from '../domain/model/cash-movement.entity';
import { OpenBankAccountCommand } from '../domain/model/open-bank-account.command';
import { movementTotals, sortMovements } from '../domain/services/movement-figures';
import { Partner } from '../domain/model/partner.entity';
import { TreasuryApi } from '../infrastructure/treasury-api';

/**
 * Treasury context state: bank accounts (also read by Billing, Expenses and Staff), their monthly movements
 * and partners. Payables, loans and contributions come with their screens.
 */
@Injectable({ providedIn: 'root' })
export class TreasuryStore {
  private readonly treasuryApi = inject(TreasuryApi);
  private readonly iamStore = inject(IamStore);
  private readonly router = inject(Router);

  private readonly bankAccountsSignal = signal<BankAccount[]>([]);
  private readonly partnersSignal = signal<Partner[]>([]);
  private readonly movementsSignal = signal<CashMovement[]>([]);
  /** Account and month whose movements are shown (to drop late answers and reload after changes). */
  private movementsKey: { bankAccountId: number; period: Period } | null = null;
  /** Requests in flight; several can run at once. */
  private readonly pendingSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  readonly bankAccounts = this.bankAccountsSignal.asReadonly();
  readonly partners = this.partnersSignal.asReadonly();
  /** Movements of the shown account and month, in date order. */
  readonly movements = this.movementsSignal.asReadonly();
  /** Inflows and outflows of the shown movements. */
  readonly movementTotals = computed(() => movementTotals(this.movementsSignal()));
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

  /** Re-reads one account (the detail may be opened directly by URL, and balances change). */
  loadBankAccount(id: number): void {
    this.run(this.treasuryApi.getBankAccountById(id), 'Failed to load bank account', (account) =>
      this.upsertAccount(account),
    );
  }

  /** Loads the movements of one account in one month, in date order. */
  loadMovements(bankAccountId: number, period: Period): void {
    const key = { bankAccountId, period };
    this.movementsKey = key;
    this.movementsSignal.set([]);
    this.run(
      this.treasuryApi.getMovements(bankAccountId, period.year, period.month),
      'Failed to load movements',
      (movements) => {
        // Ignore a late answer for an account or month the user already left.
        if (this.movementsKey === key) {
          this.movementsSignal.set(sortMovements(movements));
        }
      },
    );
  }

  /** Registers an adjustment; the backend answers with the account and its new balance. */
  registerAdjustment(bankAccountId: number, command: RegisterAdjustmentCommand): void {
    this.run(this.treasuryApi.registerAdjustment(bankAccountId, command), 'Failed to register adjustment', (account) => {
      this.upsertAccount(account);
      this.reloadMovementsOf(bankAccountId);
    });
  }

  /**
   * Transfers between two accounts. The backend answers only with the origin, but the destination changed too,
   * so every balance is re-read.
   */
  transferFunds(command: TransferFundsCommand): void {
    this.run(this.treasuryApi.transferFunds(command), 'Failed to transfer funds', () => {
      this.loadBankAccounts();
      this.reloadMovementsOf(command.fromAccountId, command.toAccountId);
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

  private upsertAccount(account: BankAccount): void {
    this.bankAccountsSignal.update((accounts) =>
      accounts.some((a) => a.id === account.id)
        ? accounts.map((a) => (a.id === account.id ? account : a))
        : [...accounts, account],
    );
  }

  /** Reloads the shown movements if they belong to one of the given accounts. */
  private reloadMovementsOf(...bankAccountIds: number[]): void {
    const key = this.movementsKey;
    if (key && bankAccountIds.includes(key.bankAccountId)) {
      this.loadMovements(key.bankAccountId, key.period);
    }
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
