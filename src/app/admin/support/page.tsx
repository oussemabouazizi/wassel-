'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HeadphonesIcon, Send, AlertTriangle, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Button, Input, Textarea, Badge, Card, Skeleton, Tabs, useToast } from '@/components/ui';
import type { Notification } from '@/types';

export default function AdminSupport() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('notifications');
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'admin' });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (err) throw err;
      setNotifications(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleSendNotification() {
    if (!form.title.trim() || !form.message.trim()) {
      toast('error', 'Title and message are required');
      return;
    }

    try {
      setSending(true);
      const supabase = createClient();

      const { data: profiles } = await supabase.from('profiles').select('id');
      if (!profiles) {
        toast('error', 'No users found');
        return;
      }

      const notificationsToInsert = profiles.map((p) => ({
        user_id: p.id,
        title: form.title,
        message: form.message,
        type: form.type,
        is_read: false,
      }));

      const { error: err } = await supabase.from('notifications').insert(notificationsToInsert);
      if (err) throw err;

      toast('success', `Notification sent to ${profiles.length} users`);
      setForm({ title: '', message: '', type: 'admin' });
      fetchNotifications();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSending(false);
    }
  }

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'send', label: 'Send Notification', icon: <Send className="w-4 h-4" /> },
  ];

  const typeBadge: Record<string, 'info' | 'warning' | 'danger' | 'primary'> = {
    admin: 'info',
    order: 'primary',
    promotion: 'warning',
    alert: 'danger',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Support</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Manage notifications and communicate with users</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'notifications' && (
        <>
          {error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertTriangle className="w-12 h-12 text-[var(--color-error)] mb-4" />
              <p className="text-[var(--color-error)] font-medium">{error}</p>
            </div>
          ) : loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-12">
                <HeadphonesIcon className="w-12 h-12 text-[var(--color-text-secondary)] mb-4" />
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">No notifications</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">No notifications have been sent yet</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-5 h-5 text-[var(--color-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--color-text-primary)]">{n.title}</span>
                            {!n.is_read && (
                              <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={typeBadge[n.type] || 'info'}>{n.type}</Badge>
                            <span className="text-xs text-[var(--color-text-secondary)]">{formatDate(n.created_at)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{n.message}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'send' && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Send Notification to All Users</h2>
          <div className="space-y-4">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Notification title"
            />
            <Textarea
              label="Message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Write your notification message..."
              rows={4}
            />
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="admin">Admin</option>
                <option value="order">Order</option>
                <option value="promotion">Promotion</option>
                <option value="alert">Alert</option>
              </select>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSendNotification} isLoading={sending}>
                <Send className="w-4 h-4" />
                Send to All Users
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
