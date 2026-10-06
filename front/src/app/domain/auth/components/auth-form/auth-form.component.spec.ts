import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthFormComponent } from './auth-form.component';

describe('AuthFormComponent', () => {
  it('does not submit a registration with mismatched passwords', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AuthFormComponent);
    fixture.componentRef.setInput('mode', 'register');
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const submitted = vi.fn();
    component.submitted.subscribe(submitted);
    component.form.setValue({
      name: 'Maxime',
      email: 'member@example.com',
      password: 'long-password',
      passwordConfirm: 'different-password',
    });
    component.submit();
    expect(submitted).not.toHaveBeenCalled();
    expect(component.form.hasError('passwordsMismatch')).toBe(true);
    component.form.controls.passwordConfirm.setValue('long-password');
    component.submit();
    expect(submitted).toHaveBeenCalledOnce();
  });

  it('does not require password confirmation for login', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AuthFormComponent);
    fixture.componentRef.setInput('mode', 'login');
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      name: ' Maxime ',
      email: '',
      password: 'long-password',
      passwordConfirm: '',
    });
    expect(fixture.componentInstance.form.valid).toBe(true);
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentInstance.submit();
    expect(submitted).toHaveBeenCalledWith({
      name: 'Maxime',
      email: '',
      password: 'long-password',
      passwordConfirm: '',
    });
    expect(fixture.nativeElement.querySelector('#email')).toBeNull();
    fixture.componentInstance.form.controls.name.setValue('   ');
    fixture.componentInstance.submit();
    expect(submitted).toHaveBeenCalledOnce();
  });
});
