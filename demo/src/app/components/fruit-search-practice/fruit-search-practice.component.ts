import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FRUIT_CATALOG } from '../../data/fruit-catalog';

@Component({
  selector: 'app-fruit-search-practice',
  imports: [FormsModule],
  templateUrl: './fruit-search-practice.component.html',
})
export class FruitSearchPracticeComponent {
  searchTerm = '';
  private allFruits = FRUIT_CATALOG;

  get filteredFruits() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.allFruits;
    return this.allFruits.filter((fruit) => fruit.name.toLowerCase().includes(term));
  }
}
