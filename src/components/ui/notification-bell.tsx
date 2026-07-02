'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Package,
  Store,
  MessageSquare,
  Truck,
  Info,
  Tag,
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { Notification } from '@/hooks/use-notifications';

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
}

const typeConfig: Record<
  Notification['type'],
  { icon: typeof Package; color: string; bg: string }
> = {
  order: {
    icon: Package,
    color: 'text-orange-500',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  store: {
    icon: Store,
    color: 'text-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  message: {
    icon: MessageSquare,
    color: 'text-purple-500',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  delivery: {
    icon: Truck,
    color: 'text-green-500',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  promo: {
    icon: Tag,
    color: 'text-pink-500',
    bg: 'bg-pink-100 dark:bg-pink-900/30',
  },
  info: {
    icon: Info,
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-800',
  },
};

export default function NotificationBell({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
      >
        <Bell className="w-5 h-5 text-[var(--color-text-primary)]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[var(--color-background)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    onMarkAllAsRead();
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:opacity-80 transition-opacity"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Bell className="w-10 h-10 text-[var(--color-text-secondary)] opacity-40 mb-3" />
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {notifications.map((notification) => {
                    const config =
                      typeConfig[notification.type] || typeConfig.info;
                    const Icon = config.icon;

                    return (
                      <li
                        key={notification.id}
                        className={cn(
                          'flex gap-3 px-4 py-3 transition-colors',
                          !notification.is_read &&
                            'bg-[var(--color-surface)]/50'
                        )}
                      >
                        <div
                          className={cn(
                            'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                            config.bg
                          )}
                        >
                          <Icon className={cn('w-4 h-4', config.color)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                'text-sm leading-snug',
                                !notification.is_read
                                  ? 'font-semibold text-[var(--color-text-primary)]'
                                  : 'text-[var(--color-text-primary)]'
                              )}
                            >
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!notification.is_read && (
                                <button
                                  onClick={() => onMarkAsRead(notification.id)}
                                  title="Mark as read"
                                  className="p-1 rounded-md hover:bg-[var(--color-surface)] transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                                </button>
                              )}
                              <button
                                onClick={() => onDelete(notification.id)}
                                title="Delete"
                                className="p-1 rounded-md hover:bg-[var(--color-surface)] transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-500" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 opacity-70">
                            {formatRelativeTime(notification.created_at)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
