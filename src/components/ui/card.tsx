'use client';

import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--color-background)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm',
        hover && 'cursor-pointer hover:shadow-md hover:border-[var(--color-primary)]/20 transition-all duration-200',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
