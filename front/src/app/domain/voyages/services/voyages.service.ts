import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, startWith } from 'rxjs';
import { VoyagesApiService } from '../data-access/voyages-api.service';
import { TravelState } from '../models/voyage.model';

@Injectable({ providedIn: 'root' })
export class VoyagesService {
  private readonly api = inject(VoyagesApiService);
  list() {
    return this.state(this.api.list());
  }
  voyage(id: string) {
    return this.state(this.api.voyage(id));
  }
  etape(voyageId: string, etapeId: string) {
    return this.state(this.api.etape(voyageId, etapeId));
  }

  private state<T>(source: Observable<T>): Observable<TravelState<T>> {
    return source.pipe(
      map((data): TravelState<T> => ({ status: 'ready', data, error: '' })),
      startWith({ status: 'loading', data: null, error: '' } as TravelState<T>),
      catchError((error: unknown) =>
        of<TravelState<T>>({
          status: 'error',
          data: null,
          error: this.api.errorMessage(error),
        }),
      ),
    );
  }
}
