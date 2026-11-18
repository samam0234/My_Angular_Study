import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export const LabCounterStore = signalStore(
  { providedIn: 'root' },
  withState({ count: 0 }),
  withMethods((store) => ({
    increment(): void {
      patchState(store, { count: store.count() + 1 });
    },
    reset(): void {
      patchState(store, { count: 0 });
    },
  })),
);
