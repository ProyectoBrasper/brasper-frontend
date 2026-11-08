import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Role } from '../domain/model/role';
import { SignInCommand } from '../domain/model/sign-in.command';
import { SignUpCommand } from '../domain/model/sign-up.command';
import { User } from '../domain/model/user.entity';
import { IamApi } from '../infrastructure/iam-api';

const SESSION_KEY = 'brasper.session';

interface StoredSession {
  token: string;
  user: { id: number; username: string; fullName: string; role: Role };
}

/**
 * IAM state: the signed-in user and token (kept in sessionStorage so a reload keeps the session)
 * and the user list for administrators.
 */
@Injectable({ providedIn: 'root' })
export class IamStore {
  private readonly iamApi = inject(IamApi);
  private readonly router = inject(Router);

  private readonly currentUserSignal = signal<User | null>(null);
  private readonly tokenSignal = signal<string | null>(null);
  private readonly usersSignal = signal<User[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly users = this.usersSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isSignedIn = computed(() => this.tokenSignal() !== null && this.currentUserSignal() !== null);
  readonly currentUsername = computed(() => this.currentUserSignal()?.username ?? '');
  readonly currentRole = computed(() => this.currentUserSignal()?.role ?? null);

  constructor() {
    this.restoreSession();
  }

  /** Signs in, stores the session and navigates to `navigateTo`. */
  signIn(command: SignInCommand, navigateTo: string[]): void {
    this.start();
    this.iamApi.signIn(command).subscribe({
      next: ({ user, token }) => {
        this.currentUserSignal.set(user);
        this.tokenSignal.set(token);
        this.saveSession(user, token);
        this.loadingSignal.set(false);
        void this.router.navigate(navigateTo);
      },
      error: (error: unknown) => this.fail(error, 'Failed to sign in'),
    });
  }

  /** Registers a user (administrators only) and navigates to `navigateTo`. */
  signUp(command: SignUpCommand, navigateTo: string[]): void {
    this.start();
    this.iamApi.signUp(command).subscribe({
      next: (user) => {
        this.usersSignal.update((users) => [...users, user]);
        this.loadingSignal.set(false);
        void this.router.navigate(navigateTo);
      },
      error: (error: unknown) => this.fail(error, 'Failed to sign up'),
    });
  }

  /** Clears the session and goes to the sign-in page. */
  signOut(): void {
    this.currentUserSignal.set(null);
    this.tokenSignal.set(null);
    this.usersSignal.set([]);
    sessionStorage.removeItem(SESSION_KEY);
    void this.router.navigate(['/sign-in']);
  }

  loadUsers(): void {
    this.start();
    this.iamApi.getUsers().subscribe({
      next: (users) => {
        this.usersSignal.set(users);
        this.loadingSignal.set(false);
      },
      error: (error: unknown) => this.fail(error, 'Failed to load users'),
    });
  }

  changeUserRole(id: number, role: Role): void {
    this.start();
    this.iamApi.changeUserRole(id, role).subscribe({
      next: (user) => this.replaceUser(user),
      error: (error: unknown) => this.fail(error, 'Failed to change user role'),
    });
  }

  deactivateUser(id: number): void {
    this.start();
    this.iamApi.deactivateUser(id).subscribe({
      next: (user) => this.replaceUser(user),
      error: (error: unknown) => this.fail(error, 'Failed to deactivate user'),
    });
  }

  /** True when the signed-in user has any of the given roles. */
  hasAnyRole(...roles: Role[]): boolean {
    return this.currentUserSignal()?.hasRole(...roles) ?? false;
  }

  private replaceUser(user: User): void {
    this.usersSignal.update((users) => users.map((u) => (u.id === user.id ? user : u)));
    this.loadingSignal.set(false);
  }

  private start(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
  }

  private fail(error: unknown, fallback: string): void {
    this.errorSignal.set(error instanceof Error ? error.message : fallback);
    this.loadingSignal.set(false);
  }

  private saveSession(user: User, token: string): void {
    const session: StoredSession = {
      token,
      user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role },
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  private restoreSession(): void {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return;
    }
    try {
      const session = JSON.parse(raw) as StoredSession;
      this.currentUserSignal.set(new User({ ...session.user, active: true }));
      this.tokenSignal.set(session.token);
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
}
