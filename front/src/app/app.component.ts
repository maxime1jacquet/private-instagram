import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './domain/auth/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet, MatToolbarModule, MatButtonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  private readonly mainContent = viewChild.required<ElementRef<HTMLElement>>('mainContent');

  async logout(): Promise<void> {
    this.auth.logout();
    await this.router.navigateByUrl('/auth/login');
  }

  focusContent(event: Event): void {
    event.preventDefault();
    this.mainContent().nativeElement.focus();
  }
}
