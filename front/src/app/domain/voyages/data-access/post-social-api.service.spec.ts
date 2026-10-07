import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import PocketBase from 'pocketbase';
import { vi } from 'vitest';
import { POCKETBASE } from '../../../core/pocketbase/pocketbase.token';
import { PostSocialApiService } from './post-social-api.service';

describe('PostSocialApiService', () => {
  it('stores comments as escaped text and identifies the authenticated author', async () => {
    const client = new PocketBase('http://localhost');
    const create = vi.fn().mockResolvedValue({});
    vi.spyOn(client, 'collection').mockReturnValue({ create } as never);
    TestBed.configureTestingModule({ providers: [{ provide: POCKETBASE, useValue: client }] });
    const api = TestBed.inject(PostSocialApiService);
    await firstValueFrom(api.comment('post-a', 'me', '<img onerror="boom">\nBonjour & merci'));
    expect(create).toHaveBeenCalledWith({
      post: 'post-a',
      author: 'me',
      message: '<p>&lt;img onerror=&quot;boom&quot;&gt;<br>Bonjour &amp; merci</p>',
    });
  });
});
