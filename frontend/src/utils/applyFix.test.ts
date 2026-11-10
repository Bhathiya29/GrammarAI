// frontend/src/utils/applyFix.test.ts
import { describe, it, expect } from 'vitest';
import { applyFix } from './applyFix';
import type { Issue } from '../types';

describe('applyFix', () => {
  it('applies fix at start, middle, and end correctly and returns correct caret', () => {
    const issue: Issue = {
      id: '1',
      start: 2,
      end: 5,
      category: 'spelling',
      message: '',
      replacements: ['cat'],
      original: 'ogg',
    };
    const result = applyFix('a ogg b', issue, 'cat');
    expect(result).not.toBeNull();
    expect(result?.text).toBe('a cat b');
    expect(result?.caret).toBe(5);
  });

  it('returns null for stale input', () => {
    const issue: Issue = {
      id: '1',
      start: 0,
      end: 3,
      category: 'spelling',
      message: '',
      replacements: ['cat'],
      original: 'dog',
    };
    const result = applyFix('cat food', issue, 'puppy');
    expect(result).toBeNull();
  });

  it('handles empty replacement (deletion)', () => {
    const issue: Issue = {
      id: '1',
      start: 5, // ' very' starts at index 5 in 'hello very world'
      end: 10,
      category: 'spelling',
      message: '',
      replacements: [],
      original: ' very',
    };
    const result = applyFix('hello very world', issue, '');
    expect(result?.text).toBe('hello world');
    expect(result?.caret).toBe(5);
  });
});