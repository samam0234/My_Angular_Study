import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FRUIT_CATALOG } from '../../../data/fruit-catalog';

@Component({
  selector: 'app-fruit-overview',
  templateUrl: './fruit-overview.component.html',
})
export class FruitOverviewComponent {
  private route = inject(ActivatedRoute);

  // 이 컴포넌트의 라우트('')에는 :id 파라미터가 없으므로, 부모 라우트(fruits/:id)의 파라미터를 읽는다.
  fruitId = Number(this.route.parent?.snapshot.paramMap.get('id'));
  fruit = FRUIT_CATALOG.find((f) => f.id === this.fruitId);
}
