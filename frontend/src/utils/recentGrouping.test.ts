import { describe, expect, it } from 'vitest';
import { FileItem } from '../types/file';
import { getRecentGroupKey, groupFilesByRecent } from './recentGrouping';

describe('recentGrouping utils', () => {
  const now = new Date('2026-02-09T10:00:00.000Z');

  it('should classify dates into expected groups', () => {
    expect(getRecentGroupKey('2026-02-09T08:00:00.000Z', now)).toBe('today');
    expect(getRecentGroupKey('2026-02-08T08:00:00.000Z', now)).toBe('yesterday');
    expect(getRecentGroupKey('2026-02-04T08:00:00.000Z', now)).toBe('last7Days');
    expect(getRecentGroupKey('2026-01-20T08:00:00.000Z', now)).toBe('last30Days');
    expect(getRecentGroupKey('2025-12-20T08:00:00.000Z', now)).toBe('older');
  });

  it('should group and sort files by recency', () => {
    const files: FileItem[] = [
      { name: 'older.md', path: '/older.md', type: 'file', lastModified: '2025-12-20T08:00:00.000Z' },
      { name: 'today-1.md', path: '/today-1.md', type: 'file', lastModified: '2026-02-09T06:00:00.000Z' },
      { name: 'today-2.md', path: '/today-2.md', type: 'file', lastModified: '2026-02-09T09:00:00.000Z' },
      { name: 'week.md', path: '/week.md', type: 'file', lastModified: '2026-02-05T12:00:00.000Z' }
    ];

    const groups = groupFilesByRecent(files, now);
    expect(groups.map((group) => group.key)).toEqual(['today', 'last7Days', 'older']);
    expect(groups[0].items.map((item) => item.name)).toEqual(['today-2.md', 'today-1.md']);
  });
});
