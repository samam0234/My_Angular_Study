import { Injectable } from '@angular/core';
import { Fruit } from '../models/fruit.model';
import { FRUIT_CATALOG } from '../data/fruit-catalog';

@Injectable({ providedIn: 'root' })
export class FruitInventoryService {
  private fruits: Fruit[] = FRUIT_CATALOG.map((fruit) => ({ ...fruit }));

  getFruits(): Fruit[] {
    return this.fruits;
  }

  bumpRandomStock() {
    const index = Math.floor(Math.random() * this.fruits.length);
    this.fruits[index] = {
      ...this.fruits[index],
      stock: this.fruits[index].stock + 1,
    };
  }
}
