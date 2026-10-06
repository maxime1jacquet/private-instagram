import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-travel-status',
  standalone: true,
  imports: [MatProgressBarModule, MatButtonModule],
  templateUrl: './travel-status.component.html',
  styleUrl: './travel-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelStatusComponent {
  readonly loading = input(false);
  readonly error = input('');
  readonly retry = output<void>();
}
