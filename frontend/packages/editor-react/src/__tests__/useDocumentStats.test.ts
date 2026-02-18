import { describe, expect, it } from 'vitest';

// Import the pure calculation function for testing
import { calculateStats } from '../hooks/useDocumentStats';

describe('calculateStats', () => {
  it('returns zero stats for empty string', () => {
    const stats = calculateStats('');
    expect(stats.wordCount).toBe(0);
    expect(stats.paragraphCount).toBe(0);
    expect(stats.readingTime).toBe(0);
    expect(stats.charCount).toBe(0);
  });

  it('returns zero stats for whitespace-only string', () => {
    const stats = calculateStats('   \n\n  ');
    expect(stats.wordCount).toBe(0);
    expect(stats.paragraphCount).toBe(0);
  });

  it('counts English words correctly', () => {
    const stats = calculateStats('Hello world this is a test');
    expect(stats.wordCount).toBe(6);
    expect(stats.charCount).toBe(21); // 'Helloworldthisisatest'
  });

  it('counts Korean characters as words', () => {
    const stats = calculateStats('안녕하세요 세상');
    // 7 Korean chars = 7 "words"
    expect(stats.wordCount).toBe(7);
  });

  it('handles mixed Korean and English', () => {
    const stats = calculateStats('Hello 안녕 world');
    // 2 English words + 2 Korean chars = 4
    expect(stats.wordCount).toBe(4);
  });

  it('counts paragraphs by double newlines', () => {
    const stats = calculateStats('First paragraph\n\nSecond paragraph\n\nThird');
    expect(stats.paragraphCount).toBe(3);
  });

  it('counts single text as one paragraph', () => {
    const stats = calculateStats('Just one paragraph here');
    expect(stats.paragraphCount).toBe(1);
  });

  it('calculates reading time for English text', () => {
    // 200 WPM for English, so 200 words = 1 minute
    const words = Array.from({ length: 200 }, () => 'word').join(' ');
    const stats = calculateStats(words);
    expect(stats.readingTime).toBe(1);
  });

  it('calculates reading time for Korean text', () => {
    // 500 chars/min for Korean, so 500 chars = 1 minute
    const chars = '가'.repeat(500);
    const stats = calculateStats(chars);
    expect(stats.readingTime).toBe(1);
  });

  it('returns at least 1 minute reading time for non-empty text', () => {
    const stats = calculateStats('Hi');
    expect(stats.readingTime).toBe(1);
  });

  it('counts characters excluding spaces', () => {
    const stats = calculateStats('a b c');
    expect(stats.charCount).toBe(3);
  });

  it('handles English words with apostrophes and hyphens', () => {
    const stats = calculateStats("don't well-known it's");
    expect(stats.wordCount).toBe(3);
  });
});
