import { describe, expect, it } from 'vitest';
import { profileOf } from './profile';

describe('profileOf', () => {
  it('defaults to own tracking', () => {
    expect(profileOf({})).toBe('own');
  });
  it('maps the old follower-only flag', () => {
    expect(profileOf({ ownTracking: false })).toBe('follower');
  });
  it('prefers the explicit profile', () => {
    expect(profileOf({ profile: 'own', ownTracking: false })).toBe('own');
  });
});
