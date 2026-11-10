import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { LedgerAccount, LedgerAccountType } from '../domain/model/ledger-account.entity';
import { AccountingApi } from '../infrastructure/accounting-api';
import { backendChart } from '../testing/ledger-account-fixtures';
import { AccountingStore } from './accounting.store';

describe('AccountingStore — chart of accounts', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountingApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: () => true } },
      ],
    });
    const store = TestBed.inject(AccountingStore);
    store.loadLedgerAccounts();
    return store;
  };

  beforeEach(() => {
    api = {
      getLedgerAccounts: vi.fn().mockReturnValue(of(backendChart())),
      createLedgerAccount: vi.fn(),
      getTaxParametersAt: vi.fn(),
    };
  });

  it('keeps the chart by code and counts it by type', () => {
    const store = createStore();
    expect(store.ledgerAccounts()[2].code).toBe('122');
    expect(store.countLedgerAccountsByType(null)).toBe(21);
    expect(store.countLedgerAccountsByType(LedgerAccountType.LIABILITY)).toBe(6);
  });

  it('adds the new account in its place by code', () => {
    api['createLedgerAccount'].mockReturnValue(
      of(new LedgerAccount({ id: 22, code: '104', name: 'Cuentas corrientes', type: LedgerAccountType.ASSET, active: true })),
    );
    const store = createStore();
    store.createLedgerAccount({ code: '104', name: 'Cuentas corrientes', type: LedgerAccountType.ASSET });
    const codes = store.ledgerAccounts().map((account) => account.code);
    expect(codes.indexOf('104')).toBe(1);
    expect(store.countLedgerAccountsByType(LedgerAccountType.ASSET)).toBe(6);
  });

  it('shows the API error and keeps the chart when the code is already in use', () => {
    api['createLedgerAccount'].mockReturnValue(throwError(() => new Error('Ya existe una cuenta contable con ese código.')));
    const store = createStore();
    store.createLedgerAccount({ code: '10', name: 'Caja', type: LedgerAccountType.ASSET });
    expect(store.error()).toBe('Ya existe una cuenta contable con ese código.');
    expect(store.ledgerAccounts()).toHaveLength(21);
    expect(store.loading()).toBe(false);
  });

  it('forgets the tax parameters when they cannot be read', () => {
    api['getTaxParametersAt'].mockReturnValue(throwError(() => new Error('Sesión no válida.')));
    const store = createStore();
    store.loadTaxParametersAt('2026-11-10');
    expect(store.taxParameters()).toBeNull();
    expect(store.error()).toBe('Sesión no válida.');
  });
});
