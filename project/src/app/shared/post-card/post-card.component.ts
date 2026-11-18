import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Post } from '../../models/post.model';

@Component({
  selector: 'app-post-card',
  imports: [RouterLink],
  templateUrl: './post-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCardComponent {
  @Input({ required: true }) post!: Post;
  @Input() isFavorite = false;
  @Output() toggleFavorite = new EventEmitter<number>();

  // 제목 링크와 별 버튼은 별개의 조작 요소다.
  onFavoriteClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.toggleFavorite.emit(this.post.id);
  }
}
