import { Component } from '@angular/core';
import { FruitListPracticeComponent } from '../../components/fruit-list-practice/fruit-list-practice.component';
import { CounterPracticeComponent } from '../../components/counter-practice/counter-practice.component';
import { FruitInventoryPracticeComponent } from '../../components/fruit-inventory-practice/fruit-inventory-practice.component';
import { FruitSearchPracticeComponent } from '../../components/fruit-search-practice/fruit-search-practice.component';
import { FruitStockMonitorComponent } from '../../components/fruit-stock-monitor/fruit-stock-monitor.component';
import { LikeableFruitListComponent } from '../../components/likeable-fruit-list/likeable-fruit-list.component';
import { LoginFormPracticeComponent } from '../../components/login-form-practice/login-form-practice.component';

@Component({
  selector: 'app-home',
  imports: [
    FruitListPracticeComponent,
    CounterPracticeComponent,
    FruitInventoryPracticeComponent,
    FruitSearchPracticeComponent,
    FruitStockMonitorComponent,
    LikeableFruitListComponent,
    LoginFormPracticeComponent,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  showStockMonitor = true;
  lastLoginAttempt = '';

  onLoginAttempt(payload: { username: string }) {
    this.lastLoginAttempt = `${payload.username}님, 로그인 시도를 받았습니다. (study4는 실제 인증 전 단계, 전역 로그인 상태는 study8에서)`;
  }
}
