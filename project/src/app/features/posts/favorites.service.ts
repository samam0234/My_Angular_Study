import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private favoriteIdsSubject = new BehaviorSubject<Set<number>>(new Set());
  favoriteIds$ = this.favoriteIdsSubject.asObservable();

  isFavorite(id: number): boolean {
    return this.favoriteIdsSubject.value.has(id);
  }

  toggle(id: number) {
    const next = new Set(this.favoriteIdsSubject.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.favoriteIdsSubject.next(next);
  }
}
