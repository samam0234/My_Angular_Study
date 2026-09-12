import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FruitInventoryService } from '../../services/fruit-inventory.service';

@Component({
  selector: 'app-fruit-stock-monitor',
  templateUrl: './fruit-stock-monitor.component.html',
})
export class FruitStockMonitorComponent implements OnInit, OnDestroy {
  @ViewChild('filterInput') filterInput?: ElementRef<HTMLInputElement>;

  tickCount = 0;
  private intervalId?: ReturnType<typeof setInterval>;

  // 컴포넌트를 만들 때 Angular가 constructor에 FruitInventoryService 인스턴스를 "주입"해준다.
  constructor(private inventoryService: FruitInventoryService) {}

  get fruits() {
    return this.inventoryService.getFruits();
  }

  ngOnInit() {
    this.intervalId = setInterval(() => {
      this.inventoryService.bumpRandomStock();
      this.tickCount++;
    }, 2000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  focusFilterInput() {
    this.filterInput?.nativeElement.focus();
  }
}
