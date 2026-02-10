import { FileItem } from '../types/file';

export type RecentGroupKey = 'last7Days' | 'last30Days' | `year:${number}`;

const RELATIVE_GROUP_ORDER: Array<'last7Days' | 'last30Days'> = ['last7Days', 'last30Days'];

const RELATIVE_GROUP_LABELS: Record<'last7Days' | 'last30Days', string> = {
  last7Days: 'Letzte 7 Tage',
  last30Days: 'Letzte 30 Tage'
};

function isYearGroupKey(key: RecentGroupKey): key is `year:${number}` {
  return key.startsWith('year:');
}

function toDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getRecentGroupKey(dateString: string, now: Date = new Date()): RecentGroupKey {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return `year:${toDayStart(now).getFullYear()}`;
  }

  const currentDay = toDayStart(now).getTime();
  const targetDay = toDayStart(date).getTime();
  const diffInDays = Math.floor((currentDay - targetDay) / (24 * 60 * 60 * 1000));

  if (diffInDays <= 7) {
    return 'last7Days';
  }
  if (diffInDays <= 30) {
    return 'last30Days';
  }
  return `year:${date.getFullYear()}`;
}

export function groupFilesByRecent(
  files: FileItem[],
  now: Date = new Date()
): Array<{ key: RecentGroupKey; label: string; items: FileItem[] }> {
  const grouped = new Map<RecentGroupKey, FileItem[]>();

  for (const file of files) {
    const key = getRecentGroupKey(file.lastModified || '', now);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(file);
    } else {
      grouped.set(key, [file]);
    }
  }

  const yearKeys = Array.from(grouped.keys())
    .filter((key): key is `year:${number}` => isYearGroupKey(key))
    .sort((a, b) => {
      const yearA = Number(a.split(':')[1] || 0);
      const yearB = Number(b.split(':')[1] || 0);
      return yearB - yearA;
    });

  const orderedKeys: RecentGroupKey[] = [
    ...RELATIVE_GROUP_ORDER.filter((key) => grouped.has(key)),
    ...yearKeys
  ];

  return orderedKeys.map((key) => {
    const items = grouped.get(key) || [];
    items.sort((a, b) => {
      const aTime = a.lastModified ? Date.parse(a.lastModified) : 0;
      const bTime = b.lastModified ? Date.parse(b.lastModified) : 0;
      return bTime - aTime;
    });

    return {
      key,
      label: isYearGroupKey(key) ? key.split(':')[1] : RELATIVE_GROUP_LABELS[key],
      items
    };
  });
}

export function formatRecentDate(dateString?: string): string {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}
