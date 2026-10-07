import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatRippleModule } from '@angular/material/core';
import { TravelImage } from '../../models/voyage.model';
import { PhotoDialogComponent } from '../photo-dialog/photo-dialog.component';
@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [MatRippleModule],
  templateUrl: './photo-gallery.component.html',
  styleUrl: './photo-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoGalleryComponent {
  private readonly dialog = inject(MatDialog);
  readonly images = input.required<TravelImage[]>();
  readonly title = input.required<string>();
  open(index: number): void {
    this.dialog.open(PhotoDialogComponent, {
      data: { images: this.images(), title: this.title(), index },
      width: '1100px',
      maxWidth: '96vw',
      maxHeight: '94vh',
      ariaLabel: 'Photos de ' + this.title(),
      restoreFocus: true,
      closeOnNavigation: true,
    });
  }
}
