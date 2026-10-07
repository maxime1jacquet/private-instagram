import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { PostSocialApiService } from '../data-access/post-social-api.service';
import { PostSocial } from '../models/voyage.model';

@Injectable()
export class PostSocialService {
  private readonly api = inject(PostSocialApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dataState = signal<PostSocial>({ likes: [], comments: [] });
  private readonly loadingState = signal(false);
  private readonly pendingState = signal(false);
  private readonly errorState = signal('');
  private postId = '';
  private generation = 0;
  readonly data = this.dataState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly pending = this.pendingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly canComment = computed(() => !!this.auth.user()?.canComment);
  readonly ownLike = computed(() =>
    this.data().likes.find((like) => like.author.id === this.auth.user()?.id),
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.generation++);
  }

  async load(postId: string): Promise<void> {
    this.postId = postId;
    const generation = ++this.generation;
    this.dataState.set({ likes: [], comments: [] });
    this.pendingState.set(false);
    this.loadingState.set(true);
    this.errorState.set('');
    try {
      const data = await firstValueFrom(this.api.load(postId, this.canComment()));
      if (generation === this.generation) this.dataState.set(data);
    } catch {
      if (generation === this.generation)
        this.errorState.set('Impossible de charger les likes et commentaires. Réessaie.');
    } finally {
      if (generation === this.generation) this.loadingState.set(false);
    }
  }

  async toggleLike(): Promise<void> {
    const user = this.auth.user();
    if (!user || this.pending() || this.loading() || this.error()) return;
    const ownLike = this.ownLike();
    await this.mutate(() =>
      firstValueFrom(ownLike ? this.api.unlike(ownLike.id) : this.api.like(this.postId, user.id)),
    );
  }

  async comment(message: string): Promise<boolean> {
    const user = this.auth.user();
    if (
      !user ||
      !this.canComment() ||
      !message.trim() ||
      this.pending() ||
      this.loading() ||
      this.error()
    )
      return false;
    return this.mutate(() => firstValueFrom(this.api.comment(this.postId, user.id, message)));
  }

  retry(): void {
    void this.load(this.postId);
  }

  private async mutate(action: () => Promise<void>): Promise<boolean> {
    const generation = this.generation;
    const postId = this.postId;
    this.pendingState.set(true);
    this.errorState.set('');
    try {
      await action();
      const data = await firstValueFrom(this.api.load(postId, this.canComment()));
      if (generation !== this.generation) return false;
      this.dataState.set(data);
      return true;
    } catch {
      if (generation === this.generation)
        this.errorState.set(
          'L’action n’a pas pu être confirmée. Recharge les réactions avant de réessayer.',
        );
      return false;
    } finally {
      if (generation === this.generation) this.pendingState.set(false);
    }
  }
}
