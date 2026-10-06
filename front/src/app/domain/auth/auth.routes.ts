import { Routes } from '@angular/router';
import { guestGuard } from './guards/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    title: 'Connexion · Mon espace',
    canActivate: [guestGuard],
    data: { mode: 'login' },
    loadComponent: () =>
      import('./pages/auth-page/auth-page.component').then((m) => m.AuthPageComponent),
  },
  {
    path: 'register',
    title: 'Créer un compte · Mon espace',
    canActivate: [guestGuard],
    data: { mode: 'register' },
    loadComponent: () =>
      import('./pages/auth-page/auth-page.component').then((m) => m.AuthPageComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
];
