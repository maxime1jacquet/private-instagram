import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from '../data-access/auth-api.service';
import { AuthCredentials, AuthMode, AuthUser } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userState = signal<AuthUser | null>(null);
  private readonly pendingState = signal(false);
  private readonly errorState = signal('');
  private restoration: Promise<void> | undefined;

  readonly user = this.userState.asReadonly();
  readonly pending = this.pendingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  constructor() {
    const unsubscribe = this.api.onSessionChange(() => {
      this.userState.set(this.api.currentUser());
    });
    this.destroyRef.onDestroy(unsubscribe);
  }

  restoreSession(): Promise<void> {
    this.restoration ??= this.restore();
    return this.restoration;
  }

  hasValidSession(): boolean {
    const user = this.api.currentUser();
    this.userState.set(user);
    return user !== null;
  }

  async authenticate(mode: AuthMode, credentials: AuthCredentials): Promise<boolean> {
    if (this.pending()) return false;
    this.pendingState.set(true);
    this.errorState.set('');
    let registered = false;
    try {
      if (mode === 'register') {
        await firstValueFrom(this.api.register(credentials));
        registered = true;
      }
      const user = await firstValueFrom(this.api.login(credentials));
      this.userState.set(user);
      return true;
    } catch (error: unknown) {
      this.errorState.set(
        registered
          ? 'Ton compte est créé. Ouvre la page de connexion pour te connecter.'
          : this.api.errorMessage(error),
      );
      return false;
    } finally {
      this.pendingState.set(false);
    }
  }

  clearError(): void {
    this.errorState.set('');
  }

  logout(): void {
    this.api.clear();
    this.userState.set(null);
    this.errorState.set('');
  }

  private async restore(): Promise<void> {
    if (!this.api.currentUser()) {
      this.api.clear();
      return;
    }
    try {
      this.userState.set(await firstValueFrom(this.api.refresh()));
    } catch {
      // A stored JWT is not sufficient: validate it with PocketBase after reload.
      this.logout();
    }
  }
}
