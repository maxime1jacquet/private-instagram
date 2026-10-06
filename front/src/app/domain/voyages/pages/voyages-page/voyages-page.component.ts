import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, Subject, switchMap } from 'rxjs';
import { TravelCardComponent } from '../../components/travel-card/travel-card.component';
import { TravelStatusComponent } from '../../components/travel-status/travel-status.component';
import { VoyagesService } from '../../services/voyages.service';
@Component({
  selector: 'app-voyages-page',
  standalone: true,
  imports: [TravelCardComponent, TravelStatusComponent],
  templateUrl: './voyages-page.component.html',
  styleUrl: './voyages-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoyagesPageComponent {
  private readonly service = inject(VoyagesService);
  private readonly reload = new Subject<void>();
  readonly state = toSignal(
    this.reload.pipe(
      startWith(undefined),
      switchMap(() => this.service.list()),
    ),
  );
  retry(): void {
    this.reload.next();
  }
}
