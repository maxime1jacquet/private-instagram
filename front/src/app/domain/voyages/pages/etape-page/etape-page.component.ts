import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, startWith, Subject, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { TravelStatusComponent } from '../../components/travel-status/travel-status.component';
import { VoyagesService } from '../../services/voyages.service';
@Component({
  selector: 'app-etape-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, TravelStatusComponent],
  templateUrl: './etape-page.component.html',
  styleUrl: './etape-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EtapePageComponent {
  private readonly service = inject(VoyagesService);
  private readonly route = inject(ActivatedRoute);
  private readonly reload = new Subject<void>();
  readonly state = toSignal(
    combineLatest([this.route.paramMap, this.reload.pipe(startWith(undefined))]).pipe(
      switchMap(([params]) =>
        this.service.etape(params.get('voyageId') ?? '', params.get('etapeId') ?? ''),
      ),
    ),
  );
  retry(): void {
    this.reload.next();
  }
}
