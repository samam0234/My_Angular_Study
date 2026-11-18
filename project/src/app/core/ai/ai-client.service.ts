import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AiClientService {
  private http = inject(HttpClient);

  async summarize(text: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<{ data: { summary: string } }>(
        `${environment.apiBaseUrl}/summarize`,
        { text },
        { withCredentials: true },
      ),
    );
    return response.data.summary;
  }
}
