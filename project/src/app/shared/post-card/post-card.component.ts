import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Post } from '../../models/post.model';

@Component({
  selector: 'app-post-card',
  imports: [RouterLink],
  templateUrl: './post-card.component.html',
})
export class PostCardComponent {
  @Input({ required: true }) post!: Post;
  @Input() isFavorite = false;
  @Output() toggleFavorite = new EventEmitter<number>();

  // 카드 전체는 상세 페이지로 이동하는 링크이고, 즐겨찾기 버튼만 페이지 이동 없이 동작해야 한다.
  onFavoriteClick(event: MouseEvent) {
    event.preventDefault(); // routerLink의 페이지 이동을 막음
    event.stopPropagation();
    this.toggleFavorite.emit(this.post.id);
  }
}
