'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  showLabel = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const colors = {
    primary: 'bg-[var(--color-primary)]',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">{value}/{max}</span>
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
