import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnChanges,
  output,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthCredentials, AuthMode } from '../../models/auth.model';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './auth-form.component.html',
  styleUrl: './auth-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  readonly mode = input.required<AuthMode>();
  readonly pending = input(false);
  readonly error = input('');
  readonly submitted = output<AuthCredentials>();

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    email: [''],
    password: ['', Validators.required],
    passwordConfirm: [''],
  });

  ngOnChanges(): void {
    const registration = this.mode() === 'register';
    this.form.controls.email.setValidators(
      registration ? [Validators.required, Validators.email] : [],
    );
    this.form.controls.email.updateValueAndValidity();
    this.form.controls.password.setValidators(
      registration ? [Validators.required, Validators.minLength(10)] : [Validators.required],
    );
    this.form.controls.passwordConfirm.setValidators(registration ? [Validators.required] : []);
    this.form.setValidators(registration ? passwordsMatch : null);
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.passwordConfirm.updateValueAndValidity();
    this.form.updateValueAndValidity();
  }

  submit(): void {
    if (this.pending()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.submitted.emit({
      ...value,
      name: value.name.trim(),
      email: this.mode() === 'register' ? value.email.trim() : '',
    });
  }
}

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  return control.get('password')?.value === control.get('passwordConfirm')?.value
    ? null
    : { passwordsMismatch: true };
}
