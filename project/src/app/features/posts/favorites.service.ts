import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

export const FAVORITES_STORAGE_KEY = 'board_demo_favorites';

function readStoredIds(): Set<number> {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is number => typeof id === 'number'));
  } catch {
    return new Set();
  }
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private favoriteIdsSignal = signal<Set<number>>(readStoredIds());
  readonly favoriteIds = this.favoriteIdsSignal.asReadonly();
  readonly favoriteIds$ = toObservable(this.favoriteIdsSignal);

  isFavorite(id: number): boolean {
    return this.favoriteIdsSignal().has(id);
  }

  toggle(id: number) {
    const next = new Set(this.favoriteIdsSignal());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.favoriteIdsSignal.set(next);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...next]));
  }
}
