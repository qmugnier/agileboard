import '@testing-library/jest-dom';

// Mock window.matchMedia BEFORE any components use it
window.matchMedia = jest.fn(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Mock localStorage properly
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock sessionStorage
global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Suppress specific console warnings
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('Warning:') || args[0].includes('not wrapped in act'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: useLayoutEffect') ||
      args[0].includes('ReactDOMTestUtils.act') ||
      args[0].includes('Not implemented: HTMLFormElement'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};
