'use client';

import { type ReactNode } from 'react';
import { useNotifications, type Notification } from '@/hooks/use-notifications';
import NotificationBell from './notification-bell';

interface NotificationProviderProps {
  children: ReactNode;
  className?: string;
}

export default function NotificationProvider({
  children,
  className,
}: NotificationProviderProps) {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  return (
    <div className={className}>
      <div className="fixed top-4 right-4 z-50">
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDelete={deleteNotification}
        />
      </div>
      {children}
    </div>
  );
}

export type { Notification };
