import { FormatInstantPipe } from './format-instant.pipe';

describe('FormatInstantPipe', () => {
  const pipe = new FormatInstantPipe();

  it('formats a local date with the given pattern', () => {
    expect(pipe.transform(new Date(2026, 10, 18, 9, 30), 'yyyy-MM-dd')).toBe('2026-11-18');
  });

  it('returns an empty string for empty or invalid input', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform('not-a-date')).toBe('');
  });
});
