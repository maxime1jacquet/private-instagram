import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, startWith, Subject, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { TravelCardComponent } from '../../components/travel-card/travel-card.component';
import { TravelStatusComponent } from '../../components/travel-status/travel-status.component';
import { VoyagesService } from '../../services/voyages.service';
@Component({
  selector: 'app-voyage-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, TravelCardComponent, TravelStatusComponent],
  templateUrl: './voyage-page.component.html',
  styleUrl: './voyage-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoyagePageComponent {
  private readonly service = inject(VoyagesService);
  private readonly route = inject(ActivatedRoute);
  private readonly reload = new Subject<void>();
  readonly state = toSignal(
    combineLatest([this.route.paramMap, this.reload.pipe(startWith(undefined))]).pipe(
      switchMap(([params]) => this.service.voyage(params.get('voyageId') ?? '')),
    ),
  );
  retry(): void {
    this.reload.next();
  }
}
