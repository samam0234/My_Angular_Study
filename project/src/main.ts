import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

fetch('/app-config.json')
  .then((response) => response.json())
  .then((config: { apiBaseUrl?: string }) => {
    if (config.apiBaseUrl) {
      environment.apiBaseUrl = config.apiBaseUrl;
    }
  })
  .catch(() => undefined)
  .then(() => bootstrapApplication(AppComponent, appConfig))
  .catch((err) => console.error(err));
