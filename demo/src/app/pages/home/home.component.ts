import { Component } from '@angular/core';
import { FruitListPracticeComponent } from '../../components/fruit-list-practice/fruit-list-practice.component';
import { CounterPracticeComponent } from '../../components/counter-practice/counter-practice.component';
import { FruitInventoryPracticeComponent } from '../../components/fruit-inventory-practice/fruit-inventory-practice.component';
import { FruitSearchPracticeComponent } from '../../components/fruit-search-practice/fruit-search-practice.component';

@Component({
  selector: 'app-home',
  imports: [
    FruitListPracticeComponent,
    CounterPracticeComponent,
    FruitInventoryPracticeComponent,
    FruitSearchPracticeComponent,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent {}
