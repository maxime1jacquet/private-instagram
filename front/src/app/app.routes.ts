import { Routes } from '@angular/router';
import { authGuard } from './domain/auth/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'voyages' },
  {
    path: 'auth',
    loadChildren: () => import('./domain/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'voyages',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadChildren: () => import('./domain/voyages/voyages.routes').then((m) => m.VOYAGES_ROUTES),
  },
  {
    path: 'account',
    title: 'Mon compte · Mon espace',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./domain/account/pages/account-page/account-page.component').then(
        (m) => m.AccountPageComponent,
      ),
  },
  { path: '**', redirectTo: 'voyages' },
];
