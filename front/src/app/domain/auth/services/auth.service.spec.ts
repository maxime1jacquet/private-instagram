import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthApiService } from '../data-access/auth-api.service';
import { AuthService } from './auth.service';
import { AuthUser } from '../models/auth.model';

describe('AuthService', () => {
  const user: AuthUser = { id: 'user-a', email: 'a@example.com', name: 'Maxime', verified: false };
  const credentials = {
    name: user.name,
    email: user.email,
    password: 'test-password',
    passwordConfirm: 'test-password',
  };
  let api: {
    currentUser: ReturnType<typeof vi.fn>;
    onSessionChange: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    errorMessage: ReturnType<typeof vi.fn>;
  };
  let auth: AuthService;

  beforeEach(() => {
    api = {
      currentUser: vi.fn(() => null),
      onSessionChange: vi.fn(() => () => undefined),
      refresh: vi.fn(() => of(user)),
      register: vi.fn(() => of(undefined)),
      login: vi.fn(() => of(user)),
      clear: vi.fn(),
      errorMessage: vi.fn(() => 'Échec de connexion'),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AuthApiService, useValue: api }] });
    auth = TestBed.inject(AuthService);
  });

  it('refreshes a persisted session once before trusting it', async () => {
    api.currentUser.mockReturnValue(user);
    await Promise.all([auth.restoreSession(), auth.restoreSession()]);
    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(auth.user()).toEqual(user);
  });

  it('clears a rejected session without preventing application startup', async () => {
    api.currentUser.mockReturnValue(user);
    api.refresh.mockReturnValue(throwError(() => new Error('expired')));
    await auth.restoreSession();
    expect(auth.isAuthenticated()).toBe(false);
    expect(api.clear).toHaveBeenCalledOnce();
  });

  it('does not attempt login if registration fails', async () => {
    api.register.mockReturnValue(throwError(() => new Error('invalid')));
    expect(await auth.authenticate('register', credentials)).toBe(false);
    expect(api.login).not.toHaveBeenCalled();
    expect(auth.error()).toBe('Échec de connexion');
    expect(auth.pending()).toBe(false);
  });

  it('explains that registration succeeded if subsequent login fails', async () => {
    api.login.mockReturnValue(throwError(() => new Error('offline')));
    expect(await auth.authenticate('register', credentials)).toBe(false);
    expect(auth.error()).toContain('Ton compte est créé');
  });

  it('prevents duplicate submissions while a request is pending', async () => {
    const response = new Subject<AuthUser>();
    api.login.mockReturnValue(response);
    const first = auth.authenticate('login', credentials);
    expect(await auth.authenticate('login', credentials)).toBe(false);
    expect(api.login).toHaveBeenCalledTimes(1);
    response.next(user);
    response.complete();
    expect(await first).toBe(true);
    auth.logout();
    expect(auth.user()).toBeNull();
  });

  it('rejects an expired session when entering a protected route', async () => {
    await auth.authenticate('login', credentials);
    api.currentUser.mockReturnValue(null);
    expect(auth.hasValidSession()).toBe(false);
    expect(auth.user()).toBeNull();
  });
});
