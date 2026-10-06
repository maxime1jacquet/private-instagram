import { InjectionToken } from '@angular/core';
import PocketBase, { LocalAuthStore } from 'pocketbase';

export const POCKETBASE = new InjectionToken<PocketBase>('POCKETBASE', {
  providedIn: 'root',
  factory: () => new PocketBase(window.location.origin, new LocalAuthStore('starter_auth')),
});
