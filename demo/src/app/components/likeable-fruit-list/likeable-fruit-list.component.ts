import { Component } from '@angular/core';
import { FRUIT_CATALOG } from '../../data/fruit-catalog';
import { FruitLikeItemComponent } from '../fruit-like-item/fruit-like-item.component';

@Component({
  selector: 'app-likeable-fruit-list',
  imports: [FruitLikeItemComponent],
  templateUrl: './likeable-fruit-list.component.html',
})
export class LikeableFruitListComponent {
  fruits = FRUIT_CATALOG;
  likedIds = new Set<number>();

  isLiked(id: number) {
    return this.likedIds.has(id);
  }

  onLikeToggled(id: number) {
    const next = new Set(this.likedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.likedIds = next;
  }
}
