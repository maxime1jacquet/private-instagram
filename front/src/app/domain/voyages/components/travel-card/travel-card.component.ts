import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { TravelCard } from '../../models/voyage.model';
@Component({
  selector: 'app-travel-card',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatRippleModule],
  templateUrl: './travel-card.component.html',
  styleUrl: './travel-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelCardComponent {
  readonly card = input.required<TravelCard>();
  readonly link = input.required<string[]>();
}
