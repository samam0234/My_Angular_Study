import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Fruit } from '../../models/fruit.model';

@Component({
  selector: 'app-fruit-like-item',
  templateUrl: './fruit-like-item.component.html',
})
export class FruitLikeItemComponent {
  @Input({ required: true }) fruit!: Fruit;
  @Input() liked = false;
  @Output() likeToggled = new EventEmitter<number>();

  onToggle() {
    this.likeToggled.emit(this.fruit.id);
  }
}
