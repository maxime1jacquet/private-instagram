import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { FormGroupDirective } from '@angular/forms';
import { vi } from 'vitest';
import { AuthService } from '../../../auth/services/auth.service';
import { PostSocialApiService } from '../../data-access/post-social-api.service';
import { PostSocialComponent } from './post-social.component';

describe('PostSocialComponent', () => {
  it('clears the submitted state after a successful comment', async () => {
    const api = {
      load: vi.fn(() => of({ likes: [], comments: [] })),
      comment: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { user: signal({ id: 'me', canComment: true }) } },
        { provide: PostSocialApiService, useValue: api },
      ],
    });
    const fixture = TestBed.createComponent(PostSocialComponent);
    fixture.componentRef.setInput('postId', 'post-a');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.componentInstance.form.controls.message.setValue('Bonjour');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.comment).toHaveBeenCalledWith('post-a', 'me', 'Bonjour');
    expect(fixture.componentInstance.form.controls.message.value).toBe('');
    expect(
      fixture.debugElement.query(By.directive(FormGroupDirective)).injector.get(FormGroupDirective)
        .submitted,
    ).toBe(false);
  });
});
