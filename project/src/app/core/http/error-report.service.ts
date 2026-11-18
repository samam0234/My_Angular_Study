import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ErrorReportService {
  private requestIdSignal = signal<string | null>(null);
  private statusSignal = signal<number | null>(null);

  readonly requestId = this.requestIdSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();

  show(requestId: string, status: number) {
    this.requestIdSignal.set(requestId);
    this.statusSignal.set(status);
  }

  clear() {
    this.requestIdSignal.set(null);
    this.statusSignal.set(null);
  }
}
