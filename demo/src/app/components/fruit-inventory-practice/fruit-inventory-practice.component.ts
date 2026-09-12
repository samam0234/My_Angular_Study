import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Fruit } from '../../models/fruit.model';
import { FRUIT_CATALOG } from '../../data/fruit-catalog';

@Component({
  selector: 'app-fruit-inventory-practice',
  imports: [FormsModule],
  templateUrl: './fruit-inventory-practice.component.html',
})
export class FruitInventoryPracticeComponent {
  fruits: Fruit[] = FRUIT_CATALOG.map((fruit) => ({ ...fruit }));
  newFruitName = '';
  private nextId = Math.max(...this.fruits.map((f) => f.id)) + 1;

  addFruit() {
    const name = this.newFruitName.trim();
    if (!name) return;

    this.fruits = [...this.fruits, { id: this.nextId++, name, stock: 1 }];
    this.newFruitName = '';
  }

  removeFruit(id: number) {
    this.fruits = this.fruits.filter((fruit) => fruit.id !== id);
  }
}
