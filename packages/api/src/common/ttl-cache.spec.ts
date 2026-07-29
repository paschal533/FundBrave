import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  it('returns a stored value before it expires', () => {
    const cache = new TtlCache<string>(10_000);
    cache.set('a', 'hello');
    expect(cache.get('a')).toBe('hello');
  });

  it('returns undefined for a key that was never set', () => {
    const cache = new TtlCache<string>(10_000);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('returns undefined once the TTL has elapsed', () => {
    jest.useFakeTimers();
    const cache = new TtlCache<string>(1_000);
    cache.set('a', 'hello');
    jest.advanceTimersByTime(1_001);
    expect(cache.get('a')).toBeUndefined();
    jest.useRealTimers();
  });

  it('overwriting a key resets its TTL', () => {
    jest.useFakeTimers();
    const cache = new TtlCache<string>(1_000);
    cache.set('a', 'first');
    jest.advanceTimersByTime(600);
    cache.set('a', 'second');
    jest.advanceTimersByTime(600);
    expect(cache.get('a')).toBe('second');
    jest.useRealTimers();
  });
});
