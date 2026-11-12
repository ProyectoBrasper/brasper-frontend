import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Role } from '../domain/model/role';
import { User } from '../domain/model/user.entity';
import { IamApi } from '../infrastructure/iam-api';
import { IamStore } from './iam.store';

const user = (active: boolean) => new User({ id: 5, username: 'pramos', fullName: 'Pedro Ramos', role: Role.ROLE_ENGINEER, active });

describe('IamStore — passwords and reactivation', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: IamApi, useValue: api },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    return TestBed.inject(IamStore);
  };

  beforeEach(() => {
    sessionStorage.clear();
    api = { changePassword: vi.fn(), resetUserPassword: vi.fn(), reactivateUser: vi.fn(), getUsers: vi.fn() };
  });

  it('tells the dialog when the password was changed, and keeps the session', () => {
    api['changePassword'].mockReturnValue(of(undefined));
    const store = createStore();
    const onDone = vi.fn();
    const command = { currentPassword: 'old12345', newPassword: 'new12345' };
    store.changePassword(command, onDone);
    expect(api['changePassword']).toHaveBeenCalledWith(command);
    expect(onDone).toHaveBeenCalled();
    expect(store.loading()).toBe(false);
  });

  it('shows the error and does not finish when the current password is wrong', () => {
    api['changePassword'].mockReturnValue(throwError(() => new Error('La contraseña actual no es correcta.')));
    const store = createStore();
    const onDone = vi.fn();
    store.changePassword({ currentPassword: 'x', newPassword: 'new12345' }, onDone);
    expect(onDone).not.toHaveBeenCalled();
    expect(store.error()).toBe('La contraseña actual no es correcta.');
    store.clearError();
    expect(store.error()).toBeNull();
  });

  it('resets a user password', () => {
    api['resetUserPassword'].mockReturnValue(of(undefined));
    const store = createStore();
    const onDone = vi.fn();
    store.resetUserPassword(5, 'new12345', onDone);
    expect(api['resetUserPassword']).toHaveBeenCalledWith(5, 'new12345');
    expect(onDone).toHaveBeenCalled();
  });

  it('replaces the reactivated user in the list', () => {
    api['getUsers'].mockReturnValue(of([user(false)]));
    api['reactivateUser'].mockReturnValue(of(user(true)));
    const store = createStore();
    store.loadUsers();
    store.reactivateUser(5);
    expect(api['reactivateUser']).toHaveBeenCalledWith(5);
    expect(store.users().map((u) => u.active)).toEqual([true]);
  });
});
