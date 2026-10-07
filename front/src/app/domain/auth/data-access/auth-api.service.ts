import { inject, Injectable } from '@angular/core';
import { defer, map, Observable } from 'rxjs';
import { ClientResponseError, RecordModel } from 'pocketbase';
import { POCKETBASE } from '../../../core/pocketbase/pocketbase.token';
import { AuthCredentials, AuthUser } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly client = inject(POCKETBASE);

  login(credentials: AuthCredentials): Observable<AuthUser> {
    return defer(() =>
      this.client
        .collection('users')
        .authWithPassword(credentials.name.trim(), credentials.password),
    ).pipe(map(({ record }) => this.toUser(record)));
  }

  register(credentials: AuthCredentials): Observable<void> {
    return defer(() =>
      this.client.collection('users').create({
        name: credentials.name.trim(),
        email: credentials.email,
        password: credentials.password,
        passwordConfirm: credentials.passwordConfirm,
        emailVisibility: false,
      }),
    ).pipe(map(() => undefined));
  }

  refresh(): Observable<AuthUser> {
    return defer(() => this.client.collection('users').authRefresh()).pipe(
      map(({ record }) => this.toUser(record)),
    );
  }

  currentUser(): AuthUser | null {
    const record = this.client.authStore.record;
    return this.client.authStore.isValid && record?.collectionName === 'users'
      ? this.toUser(record)
      : null;
  }

  onSessionChange(callback: () => void): () => void {
    return this.client.authStore.onChange(callback);
  }

  clear(): void {
    this.client.authStore.clear();
  }

  errorMessage(error: unknown): string {
    if (error instanceof ClientResponseError) {
      if (error.status === 0) return 'Connexion impossible. Réessaie dans quelques instants.';
      if (error.status === 429) return 'Trop de tentatives. Patiente avant de réessayer.';
    }
    // Do not expose raw server errors or reveal whether a first name is registered.
    return 'La demande a échoué. Vérifie les informations saisies et réessaie.';
  }

  private toUser(record: RecordModel): AuthUser {
    return {
      id: record.id,
      email: String(record['email'] ?? ''),
      name: String(record['name'] ?? ''),
      verified: Boolean(record['verified']),
      canComment: Boolean(record['comment']),
    };
  }
}
