import { describe, expect, it } from 'vitest';
import { looseParseTimeMinutes } from '../utils/fuzzyTime';

describe('looseParseTimeMinutes', () => {
  it('accepts compact pm input without a colon', () => {
    expect(looseParseTimeMinutes('645pm')).toBe(18 * 60 + 45);
  });

  it('accepts compact pm input with a single meridiem letter', () => {
    expect(looseParseTimeMinutes('645p')).toBe(18 * 60 + 45);
  });

  it('accepts compact am input without a colon', () => {
    expect(looseParseTimeMinutes('1015am')).toBe(10 * 60 + 15);
  });

  it('accepts spaced compact ampm input', () => {
    expect(looseParseTimeMinutes('6 45 pm')).toBe(18 * 60 + 45);
  });

  it('accepts one-digit minutes in colon input', () => {
    expect(looseParseTimeMinutes('6:5p')).toBe(18 * 60 + 5);
  });

  it('accepts bare hour with a single meridiem letter', () => {
    expect(looseParseTimeMinutes('6p')).toBe(18 * 60);
  });

  it('keeps existing colon input behavior', () => {
    expect(looseParseTimeMinutes('10:00 AM')).toBe(10 * 60);
  });

  it('rejects invalid compact ampm input', () => {
    expect(looseParseTimeMinutes('1365pm')).toBeNull();
  });

  it('rejects impossible meridiem hour values', () => {
    expect(looseParseTimeMinutes('0pm')).toBeNull();
  });
});
