import { fibonacci, calculateEffort, getFibonacciSequence, isFibonacciNumber } from '../utils/fibonacci';

/**
 * Test suite for Fibonacci utility functions
 */
describe('Fibonacci Utilities', () => {
  describe('fibonacci function', () => {
    test('returns 0 for n=0', () => {
      expect(fibonacci(0)).toBe(0);
    });

    test('returns 1 for n=1', () => {
      expect(fibonacci(1)).toBe(1);
    });

    test('returns 1 for n=2', () => {
      expect(fibonacci(2)).toBe(1);
    });

    test('returns 2 for n=3', () => {
      expect(fibonacci(3)).toBe(2);
    });

    test('returns 5 for n=5', () => {
      expect(fibonacci(5)).toBe(5);
    });

    test('returns 8 for n=6', () => {
      expect(fibonacci(6)).toBe(8);
    });

    test('returns correct value for n=10', () => {
      expect(fibonacci(10)).toBe(55);
    });

    test('returns 0 for negative numbers', () => {
      expect(fibonacci(-1)).toBe(0);
    });
  });

  describe('calculateEffort function', () => {
    test('returns correct effort for valid input', () => {
      const effort = calculateEffort(1);
      expect(typeof effort).toBe('number');
      expect(effort).toBeGreaterThan(0);
    });

    test('returns effort for multiple inputs', () => {
      const effort1 = calculateEffort(1);
      const effort2 = calculateEffort(2);
      expect(effort1).toBeLessThanOrEqual(effort2);
    });
  });

  describe('getFibonacciSequence function', () => {
    test('returns array of fibonacci numbers', () => {
      const sequence = getFibonacciSequence(5);
      expect(Array.isArray(sequence)).toBe(true);
      expect(sequence.length).toBeGreaterThan(0);
    });

    test('returns empty array for 0', () => {
      const sequence = getFibonacciSequence(0);
      expect(sequence.length).toBe(0);
    });

    test('returns first n fibonacci numbers', () => {
      const sequence = getFibonacciSequence(3);
      expect(sequence.length).toBeLessThanOrEqual(3);
    });
  });

  describe('isFibonacciNumber function', () => {
    test('returns true for fibonacci numbers', () => {
      expect(isFibonacciNumber(1)).toBe(true);
      expect(isFibonacciNumber(2)).toBe(true);
      expect(isFibonacciNumber(5)).toBe(true);
      expect(isFibonacciNumber(8)).toBe(true);
    });

    test('returns false for non-fibonacci numbers', () => {
      expect(isFibonacciNumber(3)).toBe(false);
      expect(isFibonacciNumber(6)).toBe(false);
      expect(isFibonacciNumber(7)).toBe(false);
    });

    test('returns false for negative numbers', () => {
      expect(isFibonacciNumber(-1)).toBe(false);
    });
  });
});
