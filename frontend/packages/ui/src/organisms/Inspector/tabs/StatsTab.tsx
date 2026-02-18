'use client';

import { BookOpen, Clock, FileText, Type } from 'lucide-react';

import { StatItem } from '../../../molecules/StatItem/StatItem';

interface StatsTabProps {
  wordCount: number;
  paragraphCount: number;
  readingTime: number;
  charCount: number;
}

export function StatsTab({ wordCount, paragraphCount, readingTime, charCount }: StatsTabProps) {
  return (
    <div className="px-4 py-3">
      <StatItem
        icon={<Type size={16} />}
        label="단어 수"
        value={wordCount.toLocaleString()}
      />
      <StatItem
        icon={<FileText size={16} />}
        label="단락 수"
        value={paragraphCount.toLocaleString()}
      />
      <StatItem
        icon={<Clock size={16} />}
        label="읽기 시간"
        value={readingTime <= 0 ? '-' : `${readingTime}분`}
      />
      <StatItem
        icon={<BookOpen size={16} />}
        label="문자 수"
        value={charCount.toLocaleString()}
      />
    </div>
  );
}
