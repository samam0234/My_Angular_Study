import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-login-form-practice',
  imports: [ReactiveFormsModule],
  templateUrl: './login-form-practice.component.html',
})
export class LoginFormPracticeComponent {
  @Output() loginAttempt = new EventEmitter<{ username: string }>();

  private fb = new FormBuilder();
  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  get username() {
    return this.form.controls.username;
  }

  get password() {
    return this.form.controls.password;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loginAttempt.emit({ username: this.form.getRawValue().username });
    this.form.reset();
  }
}
