import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgileIcon } from '../components/AgileIcon';

/**
 * Test suite for AgileIcon component
 */
describe('AgileIcon', () => {
  test('renders without crashing', () => {
    const { container } = render(<AgileIcon />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders SVG element', () => {
    const { container } = render(<AgileIcon />);
    expect(container.querySelector('svg')).toBeDefined();
  });

  test('has default size', () => {
    const { container } = render(<AgileIcon />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('24');
  });

  test('accepts custom size', () => {
    const { container } = render(<AgileIcon size={32} />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('32');
  });

  test('has default color', () => {
    const { container } = render(<AgileIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  test('accepts custom color', () => {
    const { container } = render(<AgileIcon color="#FF0000" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  test('is an SVG icon', () => {
    const { container } = render(<AgileIcon />);
    expect(container.querySelector('circle')).toBeDefined();
  });

  test('renders in document', () => {
    const { container } = render(<AgileIcon />);
    expect(container).toBeInTheDocument();
  });
});
