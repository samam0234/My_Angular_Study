import { HttpClient } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AiClientService } from '../../core/ai/ai-client.service';
import { ErrorReportService } from '../../core/http/error-report.service';
import { LabCounterStore } from '../../core/state/lab-counter.store';
import { FormatInstantPipe } from '../../shared/format-instant.pipe';

@Component({
  selector: 'app-lab-page',
  imports: [AsyncPipe, FormatInstantPipe, CdkTrapFocus],
  templateUrl: './lab-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabPageComponent {
  private behaviorCount = new BehaviorSubject(0);
  readonly behaviorCount$ = this.behaviorCount.asObservable();
  readonly signalCount = signal(0);
  readonly now = signal(new Date());
  readonly summary = signal('아직 요약을 요청하지 않았습니다.');
  readonly health = signal('아직 확인하지 않았습니다.');
  readonly counterStore = inject(LabCounterStore);
  private ai = inject(AiClientService);
  private errorReport = inject(ErrorReportService);
  private http = inject(HttpClient);

  bumpBehavior() {
    this.behaviorCount.next(this.behaviorCount.value + 1);
  }

  bumpSignal() {
    this.signalCount.update((count) => count + 1);
    this.now.set(new Date());
  }

  async summarize() {
    try {
      this.summary.set(
        await this.ai.summarize('Angular 게시판은 로그인 쿠키와 SQL Server의 게시글을 사용한다.'),
      );
    } catch {
      this.summary.set('요약에 실패했습니다. 로그인 상태와 API 연결을 확인하세요.');
    }
  }

  showSampleRequestId() {
    this.errorReport.show('lab-demo-request', 401);
  }

  checkHealth() {
    this.http
      .get<{ ok: boolean; uptimeSec: number }>(`${environment.apiBaseUrl}/health`)
      .subscribe({
        next: (body) => this.health.set(`가동 중 ${body.uptimeSec}초`),
        error: () => this.health.set('헬스 확인에 실패했습니다.'),
      });
  }
}
