import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-page',
  template: `
    <section class="practice">
      @if (allowed()) {
        <h2>관리자 전용</h2>
        <p>서버 관리자 API의 권한 검증도 통과했습니다.</p>
      } @else {
        <p>{{ message() }}</p>
      }
    </section>
  `,
})
export class AdminPageComponent {
  readonly allowed = signal(false);
  readonly message = signal('서버 권한을 확인하고 있습니다.');
  constructor() {
    inject(HttpClient).get(`${environment.apiBaseUrl}/admin/status`).subscribe({
      next: () => this.allowed.set(true),
      error: () => this.message.set('관리자 권한을 확인하지 못했습니다.'),
    });
  }
}
