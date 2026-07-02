'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order' | 'store' | 'message' | 'delivery' | 'promo' | 'info';
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const user = useAppStore((s) => s.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotifications(data as Notification[]);
      }
    } catch {
      // notifications table may not exist yet
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const deleted = payload.old as Notification;
            setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
          }
        )
        .subscribe();

      channelRef.current = channel;

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    } catch {
      // Realtime may fail if table doesn't exist
    }
  }, [user]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id);

        if (!error) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
          );
        }
      } catch {}
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
      }
    } catch {}
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (!error) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch {}
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
