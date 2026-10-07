import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { firstValueFrom, of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../auth/services/auth.service';
import { PostSocialApiService } from '../data-access/post-social-api.service';
import { PostSocialService } from './post-social.service';
import { PostSocial } from '../models/voyage.model';

describe('PostSocialService', () => {
  const empty = { likes: [], comments: [] };
  let api: {
    load: ReturnType<typeof vi.fn>;
    like: ReturnType<typeof vi.fn>;
    unlike: ReturnType<typeof vi.fn>;
    comment: ReturnType<typeof vi.fn>;
  };
  let service: PostSocialService;
  beforeEach(() => {
    api = {
      load: vi.fn(() => of(empty)),
      like: vi.fn(() => of(undefined)),
      unlike: vi.fn(() => of(undefined)),
      comment: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [
        PostSocialService,
        { provide: AuthService, useValue: { user: signal({ id: 'me', canComment: true }) } },
        { provide: PostSocialApiService, useValue: api },
      ],
    });
    service = TestBed.inject(PostSocialService);
  });
  it('prevents a second like mutation while the first is pending', async () => {
    await service.load('post-a');
    const result = new Subject<void>();
    api.like.mockReturnValue(result);
    const pending = service.toggleLike();
    await service.toggleLike();
    expect(api.like).toHaveBeenCalledTimes(1);
    result.next();
    result.complete();
    await pending;
    expect(api.like).toHaveBeenCalledWith('post-a', 'me');
    expect(service.pending()).toBe(false);
  });
  it('does not replace reactions for a new step with a late response for the previous step', async () => {
    const old = new Subject<PostSocial>();
    api.load.mockReturnValueOnce(old);
    const first = service.load('post-a');
    await service.load('post-b');
    old.next({ likes: [{ id: 'old-like', author: { id: 'other', name: 'Other' } }], comments: [] });
    old.complete();
    await first;
    expect(service.data()).toEqual(empty);
  });
  it('removes its own like and rejects empty comments', async () => {
    api.load.mockReturnValue(
      of({ likes: [{ id: 'mine', author: { id: 'me', name: 'Moi' } }], comments: [] }),
    );
    await service.load('post-a');
    await service.toggleLike();
    expect(api.unlike).toHaveBeenCalledWith('mine');
    expect(await service.comment('   ')).toBe(false);
    expect(api.comment).not.toHaveBeenCalled();
  });
});
