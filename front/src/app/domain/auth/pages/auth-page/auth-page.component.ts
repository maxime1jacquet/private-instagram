import { ChangeDetectionStrategy, Component, inject, input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFormComponent } from '../../components/auth-form/auth-form.component';
import { AuthCredentials, AuthMode } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [AuthFormComponent],
  templateUrl: './auth-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPageComponent implements OnChanges {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly mode = input.required<AuthMode>();

  ngOnChanges(): void {
    this.auth.clearError();
  }

  async submit(credentials: AuthCredentials): Promise<void> {
    if (await this.auth.authenticate(this.mode(), credentials)) {
      await this.router.navigateByUrl('/voyages');
    }
  }
}
