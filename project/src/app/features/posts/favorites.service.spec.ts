import { TestBed } from '@angular/core/testing';
import { FAVORITES_STORAGE_KEY, FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('toggles an id and reloads it from localStorage', () => {
    const first = TestBed.inject(FavoritesService);
    first.toggle(3);
    first.toggle(7);
    first.toggle(3);

    expect(first.isFavorite(7)).toBeTrue();
    expect(first.isFavorite(3)).toBeFalse();
    expect(localStorage.getItem(FAVORITES_STORAGE_KEY)).toBe('[7]');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(FavoritesService).isFavorite(7)).toBeTrue();
  });
});
