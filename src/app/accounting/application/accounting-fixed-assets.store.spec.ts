import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IamStore } from '../../iam/application/iam.store';
import { Role } from '../../iam/domain/model/role';
import { AccountingApi } from '../infrastructure/accounting-api';
import { assetFixture } from '../testing/fixed-asset-fixtures';
import { AccountingStore } from './accounting.store';

describe('AccountingStore — fixed assets', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let navigate: ReturnType<typeof vi.fn>;

  const command = {
    description: 'Equipo',
    acquiredOn: '2026-11-01',
    taxableBase: 1000,
    currency: 'PEN',
    usefulLifeMonths: 10,
    expenseId: null,
  };

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountingApi, useValue: api },
        { provide: IamStore, useValue: { hasAnyRole: (...allowed: Role[]) => allowed.includes(Role.ROLE_ADMIN) } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    const store = TestBed.inject(AccountingStore);
    store.loadFixedAssets();
    return store;
  };

  beforeEach(() => {
    navigate = vi.fn();
    api = { getFixedAssets: vi.fn().mockReturnValue(of([assetFixture()])), registerFixedAsset: vi.fn() };
  });

  it('adds the registered asset and goes back to the list', () => {
    api['registerFixedAsset'].mockReturnValue(of(assetFixture({ id: 2 })));
    const store = createStore();
    store.registerFixedAsset(command);
    expect(api['registerFixedAsset']).toHaveBeenCalledWith(command);
    expect(store.fixedAssets().map((asset) => asset.id)).toEqual([1, 2]);
    expect(navigate).toHaveBeenCalledWith(['/accounting/fixed-assets']);
  });

  it('shows the API error and stays on the form when registering fails', () => {
    api['registerFixedAsset'].mockReturnValue(throwError(() => new Error('La vida útil debe estar entre 1 y 600 meses.')));
    const store = createStore();
    store.registerFixedAsset(command);
    expect(store.error()).toBe('La vida útil debe estar entre 1 y 600 meses.');
    expect(store.fixedAssets()).toHaveLength(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});
