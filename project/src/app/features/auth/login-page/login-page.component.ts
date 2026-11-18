import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  submitted = false;
  readonly loginError = signal('');
  readonly pending = signal(false);
  readonly signupMessage = signal('');
  signupForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    nickname: ['', [Validators.required, Validators.maxLength(50)]],
  });
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  fillTestAccount() {
    this.form.setValue({ email: 'test@example.com', password: 'password123' });
  }

  fillAdminAccount() {
    this.form.setValue({ email: 'admin@example.com', password: 'password123' });
  }

  onSubmit() {
    this.submitted = true;
    this.loginError.set('');
    if (this.form.invalid || this.pending()) return;
    this.pending.set(true);

    const { email, password } = this.form.getRawValue();
    this.authService.login(email, password).subscribe({
      next: () => {
        this.pending.set(false);
        const candidate = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        const returnUrl =
          candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/';
        void this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        this.pending.set(false);
        this.loginError.set('이메일 또는 비밀번호가 올바르지 않습니다.');
      },
    });
  }

  signup() {
    this.signupMessage.set('');
    if (this.pending()) return;
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      this.signupMessage.set('이메일, 8~128자 비밀번호, 1~50자 닉네임을 확인하세요.');
      return;
    }
    this.pending.set(true);
    const { email, password, nickname } = this.signupForm.getRawValue();
    this.authService.signup(email, password, nickname).subscribe({
      next: () => {
        this.pending.set(false);
        this.form.setValue({ email, password: '' });
        this.signupForm.reset();
        this.signupMessage.set('가입했습니다. 위 로그인 폼에 비밀번호를 입력하세요.');
      },
      error: (error: HttpErrorResponse) => {
        this.pending.set(false);
        this.signupMessage.set(error.error?.error?.message ?? '가입에 실패했습니다.');
      },
    });
  }
}
