import { Component } from '@angular/core';
import { FRUIT_CATALOG } from '../../data/fruit-catalog';
import { FruitCardComponent } from '../fruit-card/fruit-card.component';

@Component({
  selector: 'app-fruit-list-practice',
  imports: [FruitCardComponent],
  templateUrl: './fruit-list-practice.component.html',
  styleUrl: './fruit-list-practice.component.css',
})
export class FruitListPracticeComponent {
  fruits = FRUIT_CATALOG;
}
