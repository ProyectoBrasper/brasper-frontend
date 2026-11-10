import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Role } from '../../iam/domain/model/role';
import { TaxParameters } from '../domain/model/tax-parameters.entity';
import { AccountingApi } from '../infrastructure/accounting-api';
import { AccountingStore } from './accounting.store';

const rates = (id: number, effectiveFrom: string) =>
  new TaxParameters({ id, effectiveFrom, igv: 0.18, detraction: 0.12, retention: 0.03, incomeTaxPrepayment: 0.015 });

describe('AccountingStore — tax parameters', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  const createStore = (roles: Role[] = [Role.ROLE_ADMIN]) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountingApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: (...allowed: Role[]) => allowed.some((r) => roles.includes(r)) } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    const store = TestBed.inject(AccountingStore);
    store.loadTaxParametersHistory();
    return store;
  };

  const command = { effectiveFrom: '2027-01-01', igv: 0.19, detraction: 0.12, retention: 0.03, incomeTaxPrepayment: 0.015 };

  beforeEach(() => {
    api = { getTaxParametersHistory: vi.fn().mockReturnValue(of([rates(1, '2026-01-01')])), setTaxParameters: vi.fn() };
  });

  it('lets only an admin set rates (accounting writes the rest of Accounting, not this)', () => {
    expect(createStore([Role.ROLE_ADMIN]).canSetTaxParameters()).toBe(true);
    TestBed.resetTestingModule();
    const accounting = createStore([Role.ROLE_ACCOUNTING]);
    expect(accounting.canSetTaxParameters()).toBe(false);
    expect(accounting.canWrite()).toBe(true);
  });

  it('adds the new rates to the history, latest effective date first', () => {
    api['setTaxParameters'].mockReturnValue(of(rates(2, '2027-01-01')));
    const store = createStore();
    const onSaved = vi.fn();
    store.setTaxParameters(command, onSaved);
    expect(api['setTaxParameters']).toHaveBeenCalledWith(command);
    expect(onSaved).toHaveBeenCalled();
    expect(store.taxParametersHistory().map((p) => p.effectiveFrom)).toEqual(['2027-01-01', '2026-01-01']);
  });

  it('shows the API error and keeps the history when the date is already used', () => {
    api['setTaxParameters'].mockReturnValue(
      throwError(() => new Error('Ya existen parámetros de impuestos para esa fecha de vigencia.')),
    );
    const store = createStore();
    const onSaved = vi.fn();
    store.setTaxParameters({ ...command, effectiveFrom: '2026-01-01' }, onSaved);
    expect(onSaved).not.toHaveBeenCalled();
    expect(store.error()).toBe('Ya existen parámetros de impuestos para esa fecha de vigencia.');
    expect(store.taxParametersHistory()).toHaveLength(1);
  });
});
