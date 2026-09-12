import { Component } from '@angular/core';

@Component({
  selector: 'app-counter-practice',
  templateUrl: './counter-practice.component.html',
})
export class CounterPracticeComponent {
  count = 0;

  increment() {
    this.count++;
  }

  decrement() {
    this.count--;
  }

  reset() {
    this.count = 0;
  }
}
