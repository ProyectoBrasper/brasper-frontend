import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Partner } from '../domain/model/partner.entity';
import { TreasuryApi } from '../infrastructure/treasury-api';
import { contributionFixture, datosPartners } from '../testing/partner-fixtures';
import { TreasuryStore } from './treasury.store';

describe('TreasuryStore — partners', () => {
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
    store.loadPartners();
    return store;
  };

  const contribution = {
    contributedOn: '2026-11-10',
    amount: 5000,
    currency: 'PEN',
    reimbursable: false,
    bankAccountId: 1,
    concept: null,
  };

  beforeEach(() => {
    api = {
      getPartners: vi.fn().mockReturnValue(of(datosPartners())),
      getBankAccounts: vi.fn().mockReturnValue(of([])),
      registerPartner: vi.fn(),
      registerContribution: vi.fn(),
    };
  });

  it('adds the registered partner without touching the balances (no cash moves)', () => {
    api['registerPartner'].mockReturnValue(of(new Partner({ id: 3, fullName: 'Lucía Paredes', role: null })));
    const store = createStore();
    store.registerPartner({ fullName: 'Lucía Paredes', role: null });
    expect(store.partners().map((p) => p.id)).toEqual([1, 2, 3]);
    expect(api['getBankAccounts']).not.toHaveBeenCalled();
  });

  it('shows the API error and keeps the partners when the name is already in use', () => {
    api['registerPartner'].mockReturnValue(throwError(() => new Error('Ya existe un socio con ese nombre.')));
    const store = createStore();
    store.registerPartner({ fullName: 'Roberto Salas Lazo', role: null });
    expect(store.error()).toBe('Ya existe un socio con ese nombre.');
    expect(store.partners()).toHaveLength(2);
  });

  it('replaces the partner after a contribution and re-reads the balances (the cash came into the account)', () => {
    api['registerContribution'].mockReturnValue(
      of(
        new Partner({
          id: 2,
          fullName: 'Mariela Cuba Núñez',
          role: 'Socia',
          totalContributed: 30000,
          contributions: [contributionFixture({ id: 4, amount: 25000 }), contributionFixture({ id: 5, amount: 5000 })],
        }),
      ),
    );
    const store = createStore();
    store.registerContribution(2, contribution);
    expect(api['registerContribution']).toHaveBeenCalledWith(2, contribution);
    expect(store.getPartnerById(2)?.totalContributed).toBe(30000);
    expect(store.getPartnerById(2)?.contributions).toHaveLength(2);
    expect(api['getBankAccounts']).toHaveBeenCalledTimes(1);
  });

  it('shows the API error and leaves the balances alone when the account is not found', () => {
    api['registerContribution'].mockReturnValue(throwError(() => new Error('No se encontró la cuenta bancaria del aporte.')));
    const store = createStore();
    store.registerContribution(2, { ...contribution, bankAccountId: 99 });
    expect(store.error()).toBe('No se encontró la cuenta bancaria del aporte.');
    expect(store.getPartnerById(2)?.totalContributed).toBe(25000);
    expect(api['getBankAccounts']).not.toHaveBeenCalled();
  });
});
