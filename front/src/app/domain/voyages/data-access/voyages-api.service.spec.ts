import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import PocketBase, { ClientResponseError } from 'pocketbase';
import { vi } from 'vitest';
import { POCKETBASE } from '../../../core/pocketbase/pocketbase.token';
import { VoyagesApiService } from './voyages-api.service';

describe('VoyagesApiService', () => {
  const trip = { id: 'trip-a', name: 'Portugal' };
  const post = { id: 'post-a', title: 'Lisbonne', trip: trip.id, description: '<p>Bonjour</p>' };
  const image = { id: 'image-a', collectionName: 'images', file: 'photo.jpg' };
  let trips: { getFullList: ReturnType<typeof vi.fn>; getOne: ReturnType<typeof vi.fn> };
  let posts: { getFullList: ReturnType<typeof vi.fn>; getFirstListItem: ReturnType<typeof vi.fn> };
  let images: { getFullList: ReturnType<typeof vi.fn>; getFirstListItem: ReturnType<typeof vi.fn> };
  let api: VoyagesApiService;

  beforeEach(() => {
    trips = {
      getFullList: vi.fn().mockResolvedValue([trip]),
      getOne: vi.fn().mockResolvedValue(trip),
    };
    posts = {
      getFullList: vi.fn().mockResolvedValue([post]),
      getFirstListItem: vi.fn().mockResolvedValue(post),
    };
    images = {
      getFullList: vi.fn().mockResolvedValue([image]),
      getFirstListItem: vi.fn().mockResolvedValue(image),
    };
    const client = new PocketBase('http://localhost');
    vi.spyOn(client, 'collection').mockImplementation(
      (name) => ({ trips, posts, images })[name as 'trips'] as never,
    );
    TestBed.configureTestingModule({ providers: [{ provide: POCKETBASE, useValue: client }] });
    api = TestBed.inject(VoyagesApiService);
  });

  it('uses a trip name and its related image for the card', async () => {
    const result = await firstValueFrom(api.list());
    expect(result[0].title).toBe('Portugal');
    expect(result[0].image?.thumbnail).toContain('thumb=300x150');
    expect(images.getFirstListItem.mock.calls[0][0]).toContain('post.trip = "trip-a"');
  });

  it('keeps a trip without photos and does not hide network failures', async () => {
    images.getFirstListItem.mockRejectedValue(new ClientResponseError({ status: 404 }));
    expect((await firstValueFrom(api.list()))[0].image).toBeNull();
    images.getFirstListItem.mockRejectedValue(new ClientResponseError({ status: 0 }));
    await expect(firstValueFrom(api.list())).rejects.toBeInstanceOf(ClientResponseError);
  });

  it('filters steps by trip and sorts them chronologically', async () => {
    const result = await firstValueFrom(api.voyage('trip-a'));
    expect(posts.getFullList).toHaveBeenCalledWith(
      expect.objectContaining({ filter: 'trip = "trip-a"', sort: 'created,id' }),
    );
    expect(result.etapes[0].title).toBe('Lisbonne');
  });

  it('checks that a step belongs to the requested trip before fetching its photos', async () => {
    posts.getFirstListItem.mockRejectedValue(new ClientResponseError({ status: 404 }));
    await expect(firstValueFrom(api.etape('trip-b', 'post-a'))).rejects.toBeInstanceOf(
      ClientResponseError,
    );
    expect(posts.getFirstListItem.mock.calls[0][0]).toBe('id = "post-a" && trip = "trip-b"');
    expect(images.getFullList).not.toHaveBeenCalled();
  });
});
