import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FRUIT_CATALOG } from '../../data/fruit-catalog';

@Component({
  selector: 'app-fruit-detail-page',
  imports: [RouterLink],
  templateUrl: './fruit-detail.component.html',
})
export class FruitDetailPageComponent {
  private route = inject(ActivatedRoute);

  // snapshot: 이 컴포넌트가 처음 생성될 때의 파라미터 값을 1회 읽기
  fruitId = Number(this.route.snapshot.paramMap.get('id'));
  fruit = FRUIT_CATALOG.find((f) => f.id === this.fruitId);
}
