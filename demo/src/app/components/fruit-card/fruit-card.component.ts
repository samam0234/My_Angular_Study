import { Component, Input } from '@angular/core';
import { Fruit } from '../../models/fruit.model';
import { FruitBadgeComponent } from '../fruit-badge/fruit-badge.component';

@Component({
  selector: 'app-fruit-card',
  imports: [FruitBadgeComponent],
  templateUrl: './fruit-card.component.html',
  styleUrl: './fruit-card.component.css',
})
export class FruitCardComponent {
  @Input({ required: true }) fruit!: Fruit;
}
