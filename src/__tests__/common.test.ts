import { describe, it, expect } from 'vitest';
import {
  countryCode,
  parseDate,
  parsePrice,
  parseRating,
  parseSize,
  splitList,
} from '../lib/common.js';

describe('countryCode', () => {
  it('defaults to USA', () => {
    expect(countryCode()).toBe('USA');
  });

  it('maps two-letter codes to alpha-3', () => {
    expect(countryCode('fi')).toBe('FIN');
    expect(countryCode('GB')).toBe('GBR');
  });

  it('passes three-letter codes through, uppercased', () => {
    expect(countryCode('kor')).toBe('KOR');
  });

  it('throws on unknown codes', () => {
    expect(() => countryCode('xx')).toThrow('Unknown country code: xx');
  });
});

describe('parseRating', () => {
  it('parses whole and half star classes', () => {
    expect(parseRating('stars rating-stars-4-5')).toBe(4.5);
    expect(parseRating('stars rating-stars-5')).toBe(5);
    expect(parseRating('stars rating-stars-0')).toBe(0);
  });

  it('returns 0 for missing values', () => {
    expect(parseRating(null)).toBe(0);
    expect(parseRating('')).toBe(0);
  });
});

describe('parsePrice', () => {
  it.each([
    ['$0.00', 0],
    ['€0,00', 0],
    ['0,00€', 0],
    ['$4.99', 4.99],
    ['€4,99', 4.99],
    ['$1,299.99', 1299.99],
    ['1.299,99 €', 1299.99],
    ['￦0', 0],
    ['￦1,200', 1200],
    ['', 0],
  ])('parses %s', (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });
});

describe('parseDate', () => {
  it('converts the store date format to ISO', () => {
    expect(parseDate('2026.09.25.')).toBe('2026-09-25');
    expect(parseDate('2026.1.5.')).toBe('2026-01-05');
  });

  it('returns unrecognized formats unchanged', () => {
    expect(parseDate('yesterday')).toBe('yesterday');
    expect(parseDate(null)).toBe('');
  });
});

describe('parseSize', () => {
  it('converts display sizes to bytes', () => {
    expect(parseSize('125.04 MB')).toBe(Math.round(125.04 * 1024 ** 2));
    expect(parseSize('1.2 GB')).toBe(Math.round(1.2 * 1024 ** 3));
    expect(parseSize('512 KB')).toBe(512 * 1024);
  });

  it('returns 0 for missing values', () => {
    expect(parseSize(null)).toBe(0);
  });
});

describe('splitList', () => {
  it('splits pipe-separated values and drops blanks', () => {
    expect(splitList('App activity| App info |')).toEqual(['App activity', 'App info']);
    expect(splitList(null)).toEqual([]);
  });
});
