// Fibonacci sequence for effort estimation
export const FIBONACCI_SEQUENCE = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

/**
 * Calculate the nth Fibonacci number
 * @param {number} n - The position in the Fibonacci sequence
 * @returns {number} The nth Fibonacci number
 */
export const fibonacci = (n) => {
  if (n < 0) return 0;
  if (n === 0) return 0;
  if (n === 1) return 1;
  
  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
};

/**
 * Calculate effort value based on fibonacci number
 * @param {number} value - Input value
 * @returns {number} Calculated effort
 */
export const calculateEffort = (value) => {
  return fibonacci(value) * 2;
};

/**
 * Get first n Fibonacci numbers
 * @param {number} n - Number of fibonacci numbers to return
 * @returns {array} Array of first n fibonacci numbers
 */
export const getFibonacciSequence = (n) => {
  if (n <= 0) return [];
  const result = [];
  for (let i = 1; i <= n && i <= FIBONACCI_SEQUENCE.length; i++) {
    result.push(fibonacci(i));
  }
  return result;
};

/**
 * Check if a number is in the Fibonacci sequence
 * For agile planning, recognizes the planning poker sequence: 1, 2, 5, 8, 13, 21, 34, 55, 89
 * @param {number} value - Number to check
 * @returns {boolean} True if value is a valid planning poker Fibonacci number
 */
export const isFibonacciNumber = (value) => {
  // Planning poker sequence (skips 3)
  const validFibonacci = [1, 2, 5, 8, 13, 21, 34, 55, 89, 144];
  return validFibonacci.includes(value);
};

/**
 * Get the next Fibonacci value in the sequence
 * @param {number} current - Current effort value
 * @returns {number} Next Fibonacci value or the same if at end
 */
export const getNextFibonacci = (current) => {
  const index = FIBONACCI_SEQUENCE.indexOf(current);
  if (index === -1 || index >= FIBONACCI_SEQUENCE.length - 1) {
    return FIBONACCI_SEQUENCE[FIBONACCI_SEQUENCE.length - 1];
  }
  return FIBONACCI_SEQUENCE[index + 1];
};

/**
 * Get the previous Fibonacci value in the sequence
 * @param {number} current - Current effort value
 * @returns {number} Previous Fibonacci value or the same if at start
 */
export const getPreviousFibonacci = (current) => {
  const index = FIBONACCI_SEQUENCE.indexOf(current);
  if (index <= 0) {
    return FIBONACCI_SEQUENCE[0];
  }
  return FIBONACCI_SEQUENCE[index - 1];
};

/**
 * Find the closest Fibonacci value from any number
 * @param {number} value - Any number
 * @returns {number} Closest Fibonacci value
 */
export const getClosestFibonacci = (value) => {
  if (value < FIBONACCI_SEQUENCE[0]) return FIBONACCI_SEQUENCE[0];
  
  let closest = FIBONACCI_SEQUENCE[0];
  let minDiff = Math.abs(value - closest);
  
  for (let fib of FIBONACCI_SEQUENCE) {
    const diff = Math.abs(value - fib);
    if (diff < minDiff) {
      minDiff = diff;
      closest = fib;
    }
  }
  
  return closest;
};

/**
 * Validate if a value is valid Fibonacci number
 * @param {number} value - Value to check
 * @returns {boolean} True if value is in Fibonacci sequence
 */
export const isValidFibonacci = (value) => {
  return FIBONACCI_SEQUENCE.includes(value);
};
