import { titleCase } from '../utils';

describe('titleCase', () => {
  it('should capitalize first letter of each word', () => {
    expect(titleCase('john doe')).toBe('John Doe');
  });

  it('should handle single word', () => {
    expect(titleCase('hello')).toBe('Hello');
  });

  it('should handle already title-cased string', () => {
    expect(titleCase('John Doe')).toBe('John Doe');
  });

  it('should handle mixed case', () => {
    expect(titleCase('jOHN dOE')).toBe('John Doe');
  });

  it('should handle empty string', () => {
    expect(titleCase('')).toBe('');
  });

  it('should handle null', () => {
    expect(titleCase(null)).toBe('');
  });

  it('should handle undefined', () => {
    expect(titleCase(undefined)).toBe('');
  });

  it('should handle string with numbers', () => {
    expect(titleCase('test123 user')).toBe('Test123 User');
  });
});
