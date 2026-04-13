import React from 'react';
import { FiPlus, FiMinus } from 'react-icons/fi';
import { FIBONACCI_SEQUENCE, getNextFibonacci, getPreviousFibonacci } from '../utils/fibonacci';

export const FibonacciEffortSelector = ({ value, onChange, className = '' }) => {
  const handleDecrement = () => {
    const newValue = getPreviousFibonacci(value);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = getNextFibonacci(value);
    onChange(newValue);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        className="px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded transition"
        title="Decrease effort (Fibonacci sequence)"
      >
        <FiMinus size={16} />
      </button>
      
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-16"
      >
        {FIBONACCI_SEQUENCE.map((fib) => (
          <option key={fib} value={fib}>
            {fib}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleIncrement}
        className="px-2 py-1 bg-blue-200 dark:bg-blue-900/30 hover:bg-blue-300 dark:hover:bg-blue-800/50 text-blue-900 dark:text-blue-300 rounded transition"
        title="Increase effort (Fibonacci sequence)"
      >
        <FiPlus size={16} />
      </button>
    </div>
  );
};

export default FibonacciEffortSelector;
