import { describe, it, expect } from 'vitest';
import { buildSegments } from './segments';
import type { Issue } from '../types';

describe('buildSegments', () => {
  it('returns a single plain segment when there are no issues', () => {
    const segments = buildSegments('Hello world', []);
    expect(segments).toEqual([{ text: 'Hello world' }]);
  });

  it('splits text correctly with one issue in the middle', () => {
    const issue: Issue = {
      id: '1',
      start: 2,
      end: 7,
      category: 'spelling',
      message: 'test',
      replacements: [],
      original: 'cieve', // indices 2-7 of 'recieve' spell 'cieve'
    };
    const segments = buildSegments('recieve', [issue]);
    expect(segments).toEqual([
      { text: 're' },
      { text: 'cieve', issue },
    ]);
  });

  it('drops stale issues where original does not match text slice', () => {
    const staleIssue: Issue = {
      id: '1',
      start: 0,
      end: 5,
      category: 'spelling',
      message: 'test',
      replacements: [],
      original: 'wrong',
    };
    const segments = buildSegments('hello', [staleIssue]);
    expect(segments).toEqual([{ text: 'hello' }]);
  });

  it('invariant: concatenation of all segment texts always equals original text', () => {
    const text = 'I recieve teh mesage tommorow.';
    const issues: Issue[] = [
      { id: '1', start: 2, end: 9, category: 'spelling', message: '', replacements: [], original: 'recieve' },
      { id: '2', start: 10, end: 13, category: 'spelling', message: '', replacements: [], original: 'teh' },
    ];
    const segments = buildSegments(text, issues);
    const concatenated = segments.map((s) => s.text).join('');
    expect(concatenated).toBe(text);
  });
});