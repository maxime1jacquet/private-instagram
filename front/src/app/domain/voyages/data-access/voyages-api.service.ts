import { inject, Injectable } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { ClientResponseError, RecordModel } from 'pocketbase';
import { POCKETBASE } from '../../../core/pocketbase/pocketbase.token';
import { Etape, EtapeDetail, TravelImage, Voyage, VoyageDetail } from '../models/voyage.model';

@Injectable({ providedIn: 'root' })
export class VoyagesApiService {
  private readonly client = inject(POCKETBASE);

  list(): Observable<Voyage[]> {
    return defer(async () => {
      const trips = await this.client
        .collection('trips')
        .getFullList({ sort: '-created,id', requestKey: null });
      return Promise.all(
        trips.map(async (trip) =>
          this.toVoyage(
            trip,
            await this.cover(this.client.filter('post.trip = {:trip}', { trip: trip.id })),
          ),
        ),
      );
    });
  }

  voyage(id: string): Observable<VoyageDetail> {
    return defer(async () => {
      const trip = await this.client.collection('trips').getOne(id, { requestKey: null });
      const posts = await this.client.collection('posts').getFullList({
        filter: this.client.filter('trip = {:trip}', { trip: id }),
        sort: 'created,id',
        requestKey: null,
      });
      const etapes = await Promise.all(
        posts.map(async (post, index) =>
          this.toEtape(
            post,
            index + 1,
            await this.cover(this.client.filter('post = {:post}', { post: post.id })),
          ),
        ),
      );
      return {
        voyage: this.toVoyage(trip, etapes.find((etape) => etape.image)?.image ?? null),
        etapes: etapes.reverse(),
      };
    });
  }

  etape(voyageId: string, etapeId: string): Observable<EtapeDetail> {
    return defer(async () => {
      const trip = await this.client.collection('trips').getOne(voyageId, { requestKey: null });
      // Match both identifiers: a step from another trip must not appear under this URL.
      const post = await this.client
        .collection('posts')
        .getFirstListItem(
          this.client.filter('id = {:post} && trip = {:trip}', { post: etapeId, trip: voyageId }),
          { requestKey: null },
        );
      const siblings = await this.client.collection('posts').getFullList({
        filter: this.client.filter('trip = {:trip}', { trip: voyageId }),
        sort: 'created,id',
        requestKey: null,
        fields: 'id,title,trip,created',
      });
      const index = siblings.findIndex((record) => record.id === post.id);
      const records = await this.client.collection('images').getFullList({
        filter: this.client.filter('post = {:post}', { post: post.id }),
        sort: 'created,id',
        requestKey: null,
      });
      const images = records
        .filter((record) => record['file'])
        .map((record) => this.toImage(record));
      return {
        voyage: this.toVoyage(trip, null),
        etape: this.toEtape(post, index + 1, images[0] ?? null),
        previous: index > 0 ? this.toEtape(siblings[index - 1], index, null) : null,
        next:
          index >= 0 && index < siblings.length - 1
            ? this.toEtape(siblings[index + 1], index + 2, null)
            : null,
        images,
      };
    });
  }

  errorMessage(error: unknown): string {
    return error instanceof ClientResponseError && error.status === 404
      ? 'Ce voyage ou cette étape est introuvable.'
      : 'Impossible de charger le carnet. Vérifie ta connexion et réessaie.';
  }

  private async cover(filter: string): Promise<TravelImage | null> {
    try {
      const record = await this.client
        .collection('images')
        .getFirstListItem(`(${filter}) && file != ''`, { sort: 'created,id', requestKey: null });
      return this.toImage(record);
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) return null;
      throw error;
    }
  }

  private toImage(record: RecordModel): TravelImage {
    const file = String(record['file']);
    return {
      id: record.id,
      url: this.client.files.getURL(record, file),
      thumbnail: this.client.files.getURL(record, file, { thumb: '300x150' }),
    };
  }

  private toVoyage(record: RecordModel, image: TravelImage | null): Voyage {
    return { id: record.id, title: String(record['name'] || 'Voyage sans titre'), image };
  }

  private toEtape(record: RecordModel, number: number, image: TravelImage | null): Etape {
    return {
      id: record.id,
      number,
      title: String(record['title'] || 'Étape sans titre'),
      image,
      voyageId: String(record['trip']),
      description: String(record['description'] ?? ''),
      created: String(record['created'] ?? ''),
    };
  }
}
