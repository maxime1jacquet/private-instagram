import { Routes } from '@angular/router';
export const VOYAGES_ROUTES: Routes = [
  {
    path: '',
    title: 'Les voyages · Carnets de voyage',
    loadComponent: () =>
      import('./pages/voyages-page/voyages-page.component').then((m) => m.VoyagesPageComponent),
  },
  {
    path: ':voyageId',
    title: 'Les étapes · Carnets de voyage',
    loadComponent: () =>
      import('./pages/voyage-page/voyage-page.component').then((m) => m.VoyagePageComponent),
  },
  {
    path: ':voyageId/etapes/:etapeId',
    title: 'Une étape · Carnets de voyage',
    loadComponent: () =>
      import('./pages/etape-page/etape-page.component').then((m) => m.EtapePageComponent),
  },
];
