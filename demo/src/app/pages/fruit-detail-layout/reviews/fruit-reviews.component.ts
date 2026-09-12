import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-fruit-reviews',
  templateUrl: './fruit-reviews.component.html',
})
export class FruitReviewsComponent {
  private route = inject(ActivatedRoute);
  fruitId = Number(this.route.parent?.snapshot.paramMap.get('id'));
  reviews = ['정말 맛있어요!', '신선했습니다.', '다음에 또 살게요.'];
}
