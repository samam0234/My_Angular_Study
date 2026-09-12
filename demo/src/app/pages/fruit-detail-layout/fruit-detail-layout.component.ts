import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FRUIT_CATALOG } from '../../data/fruit-catalog';

@Component({
  selector: 'app-fruit-detail-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './fruit-detail-layout.component.html',
})
export class FruitDetailLayoutComponent {
  private route = inject(ActivatedRoute);

  fruitId = Number(this.route.snapshot.paramMap.get('id'));
  fruit = FRUIT_CATALOG.find((f) => f.id === this.fruitId);
}
