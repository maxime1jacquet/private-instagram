import { inject, Injectable } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { POCKETBASE } from '../../../core/pocketbase/pocketbase.token';
import { PostAuthor, PostSocial } from '../models/voyage.model';

@Injectable({ providedIn: 'root' })
export class PostSocialApiService {
  private readonly client = inject(POCKETBASE);
  load(postId: string, canComment: boolean): Observable<PostSocial> {
    return defer(async () => {
      const filter = this.client.filter('post = {:post}', { post: postId });
      const [likes, comments] = await Promise.all([
        this.client
          .collection('likes')
          .getFullList({ filter, sort: 'created,id', requestKey: null }),
        canComment
          ? this.client
              .collection('comments')
              .getFullList({ filter, sort: 'created,id', requestKey: null })
          : [],
      ]);
      const ids = [
        ...new Set(
          [...likes, ...comments].map((record) => String(record['author'])).filter(Boolean),
        ),
      ];
      const names = new Map<string, PostAuthor>();
      if (ids.length) {
        const profiles = await this.client.collection('album_authors').getFullList({
          filter: ids.map((id) => this.client.filter('id = {:id}', { id })).join(' || '),
          fields: 'id,name',
          requestKey: null,
        });
        profiles.forEach((profile) =>
          names.set(profile.id, { id: profile.id, name: String(profile['name'] || 'Utilisateur') }),
        );
      }
      const author = (id: string): PostAuthor => names.get(id) ?? { id, name: 'Compte supprimé' };
      return {
        likes: likes.map((record) => ({ id: record.id, author: author(String(record['author'])) })),
        comments: comments.map((record) => ({
          id: record.id,
          author: author(String(record['author'])),
          message: String(record['message'] ?? ''),
          created: String(record['created'] ?? ''),
        })),
      };
    });
  }
  like(postId: string, authorId: string): Observable<void> {
    return defer(async () => {
      await this.client.collection('likes').create({ post: postId, author: authorId });
    });
  }
  unlike(id: string): Observable<void> {
    return defer(async () => {
      await this.client.collection('likes').delete(id);
    });
  }
  comment(postId: string, authorId: string, message: string): Observable<void> {
    // The editor field stores HTML. Escape plain text before storing it.
    const escaped = message
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
    return defer(async () => {
      await this.client
        .collection('comments')
        .create({ post: postId, author: authorId, message: '<p>' + escaped + '</p>' });
    });
  }
}
