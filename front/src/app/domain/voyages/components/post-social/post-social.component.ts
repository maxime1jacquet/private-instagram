import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PostSocialService } from '../../services/post-social.service';
import { TravelStatusComponent } from '../travel-status/travel-status.component';
@Component({
  selector: 'app-post-social',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    TravelStatusComponent,
  ],
  providers: [PostSocialService],
  templateUrl: './post-social.component.html',
  styleUrl: './post-social.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostSocialComponent {
  private readonly fb = inject(FormBuilder);
  readonly social = inject(PostSocialService);
  readonly postId = input.required<string>();
  readonly form = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(5000)]],
  });
  private readonly commentInput = viewChild<ElementRef<HTMLTextAreaElement>>('commentInput');
  private readonly formDirective = viewChild(FormGroupDirective);
  private readonly loadEffect = effect(() => {
    this.form.reset();
    void this.social.load(this.postId());
  });

  focusComment(): void {
    this.commentInput()?.nativeElement.focus();
    this.commentInput()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const postId = this.postId();
    if (await this.social.comment(this.form.getRawValue().message)) {
      if (postId === this.postId()) this.formDirective()?.resetForm();
    }
  }
}
