import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { PaymentStatus } from '../../shared/domain/model/payment-status';
import { LoanType } from '../domain/model/loan.entity';
import { TreasuryApi } from '../infrastructure/treasury-api';
import { datosLoans, loanFixture } from '../testing/loan-fixtures';
import { TreasuryStore } from './treasury.store';

describe('TreasuryStore — loans', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TreasuryApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: () => true } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    const store = TestBed.inject(TreasuryStore);
    store.loadLoans();
    return store;
  };

  const command = {
    type: LoanType.RECEIVED,
    counterparty: 'Interbank',
    principal: 50000,
    currency: 'PEN',
    interestRate: 0.09,
    disbursedOn: '2026-11-09',
    bankAccountId: 1,
  };

  beforeEach(() => {
    api = {
      getLoans: vi.fn().mockReturnValue(of(datosLoans())),
      getBankAccounts: vi.fn().mockReturnValue(of([])),
      registerLoan: vi.fn(),
    };
  });

  it('counts loans by type for the filter chips', () => {
    const store = createStore();
    expect(store.countLoansByType(null)).toBe(2);
    expect(store.countLoansByType(LoanType.RECEIVED)).toBe(1);
    expect(store.countLoansByType(LoanType.GRANTED)).toBe(1);
  });

  it('adds the registered loan, re-reads the balances (the disbursement moved cash) and goes to the list', () => {
    api['registerLoan'].mockReturnValue(
      of(loanFixture({ id: 3, counterparty: 'Interbank', principal: 50000, outstandingBalance: 50000, status: PaymentStatus.PENDING })),
    );
    const store = createStore();
    const router = TestBed.inject(Router);
    store.registerLoan(command, ['/treasury/loans']);
    expect(api['registerLoan']).toHaveBeenCalledWith(command);
    expect(store.loans().map((loan) => loan.id)).toEqual([1, 2, 3]);
    expect(api['getBankAccounts']).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/treasury/loans']);
  });

  it('shows the API error, keeps the list and does not navigate when the account is not found', () => {
    api['registerLoan'].mockReturnValue(
      throwError(() => new Error('No se encontró la cuenta bancaria del préstamo.')),
    );
    const store = createStore();
    const router = TestBed.inject(Router);
    store.registerLoan(command, ['/treasury/loans']);
    expect(store.error()).toBe('No se encontró la cuenta bancaria del préstamo.');
    expect(store.loans()).toHaveLength(2);
    expect(api['getBankAccounts']).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
