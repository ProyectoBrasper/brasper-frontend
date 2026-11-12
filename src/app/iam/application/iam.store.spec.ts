import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Role } from '../domain/model/role';
import { SignInCommand } from '../domain/model/sign-in.command';
import { User } from '../domain/model/user.entity';
import { IamApi } from '../infrastructure/iam-api';
import { IamStore } from './iam.store';

const admin = new User({ id: 1, username: 'cmendoza', fullName: 'Carla Mendoza Rojas', role: Role.ROLE_ADMIN, active: true });
const command = new SignInCommand({ username: 'cmendoza', password: 'secret' });

describe('IamStore', () => {
  let api: { signIn: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  const createStore = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: IamApi, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
    return TestBed.inject(IamStore);
  };

  beforeEach(() => {
    sessionStorage.clear();
    api = { signIn: vi.fn() };
    router = { navigate: vi.fn().mockResolvedValue(true) };
  });

  it('starts signed out', () => {
    const store = createStore();
    expect(store.isSignedIn()).toBe(false);
    expect(store.currentRole()).toBeNull();
  });

  it('signs in, keeps the session and navigates', () => {
    api.signIn.mockReturnValue(of({ user: admin, token: 'fake-jwt.1' }));
    const store = createStore();

    store.signIn(command, ['/projects']);

    expect(store.isSignedIn()).toBe(true);
    expect(store.currentUsername()).toBe('cmendoza');
    expect(store.hasAnyRole(Role.ROLE_ADMIN, Role.ROLE_ACCOUNTING)).toBe(true);
    expect(store.hasAnyRole(Role.ROLE_ENGINEER)).toBe(false);
    expect(sessionStorage.getItem('brasper.session')).toContain('fake-jwt.1');
    expect(router.navigate).toHaveBeenCalledWith(['/projects']);
  });

  it('exposes the API error message when sign-in fails', () => {
    api.signIn.mockReturnValue(throwError(() => new Error('Usuario o contraseña incorrectos.')));
    const store = createStore();

    store.signIn(command, ['/projects']);

    expect(store.isSignedIn()).toBe(false);
    expect(store.error()).toBe('Usuario o contraseña incorrectos.');
    expect(store.loading()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('restores a saved session after a reload', () => {
    sessionStorage.setItem(
      'brasper.session',
      JSON.stringify({ token: 'fake-jwt.1', user: { id: 1, username: 'cmendoza', fullName: 'Carla', role: Role.ROLE_ADMIN } }),
    );
    const store = createStore();
    expect(store.isSignedIn()).toBe(true);
    expect(store.currentRole()).toBe(Role.ROLE_ADMIN);
  });

  it('signs out, clears the session and goes to sign-in', () => {
    api.signIn.mockReturnValue(of({ user: admin, token: 'fake-jwt.1' }));
    const store = createStore();
    store.signIn(command, ['/projects']);

    store.signOut();

    expect(store.isSignedIn()).toBe(false);
    expect(sessionStorage.getItem('brasper.session')).toBeNull();
    expect(router.navigate).toHaveBeenLastCalledWith(['/sign-in']);
  });
});
