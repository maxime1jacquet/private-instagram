import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TravelImage } from '../../models/voyage.model';
export interface PhotoDialogData {
  images: TravelImage[];
  index: number;
  title: string;
}
@Component({
  selector: 'app-photo-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './photo-dialog.component.html',
  styleUrl: './photo-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.arrowLeft)': 'previous($event)', '(keydown.arrowRight)': 'next($event)' },
})
export class PhotoDialogComponent {
  readonly data = inject<PhotoDialogData>(MAT_DIALOG_DATA);
  private readonly indexState = signal(this.data.index);
  readonly index = this.indexState.asReadonly();
  previous(event?: Event): void {
    event?.preventDefault();
    if (this.index() > 0) this.indexState.update((index) => index - 1);
  }
  next(event?: Event): void {
    event?.preventDefault();
    if (this.index() < this.data.images.length - 1) this.indexState.update((index) => index + 1);
  }
}
