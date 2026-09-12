import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-fruit-badge',
  templateUrl: './fruit-badge.component.html',
  styleUrl: './fruit-badge.component.css',
})
export class FruitBadgeComponent {
  @Input({ required: true }) soldOut = false;
}
