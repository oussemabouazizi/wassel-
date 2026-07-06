'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Bell, BellOff, ShoppingBag, Truck, Tag, MessageSquare, Mail, Smartphone, Save
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { useToast } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

interface NotificationPrefs {
  orderUpdates: boolean;
  promotions: boolean;
  deliveryUpdates: boolean;
  chatMessages: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
}

const defaultPrefs: NotificationPrefs = {
  orderUpdates: true,
  promotions: true,
  deliveryUpdates: true,
  chatMessages: true,
  emailNotifications: false,
  pushNotifications: true,
  soundEnabled: true,
};

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0',
        enabled ? 'bg-gradient-to-r from-[#FF6B00] to-[#E55A00]' : 'bg-[var(--color-border)]'
      )}
    >
      <motion.div
        className="absolute w-5 h-5 rounded-full bg-white top-0.5 shadow-md"
        animate={{ x: enabled ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

export default function SettingsNotificationsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAppStore((s) => s.user);
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadPrefs();
  }, [user, router]);

  async function loadPrefs() {
    if (!user) return;
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      if (data?.notification_preferences) {
        setPrefs({ ...defaultPrefs, ...data.notification_preferences });
      }
    } catch {
      // Use defaults
    } finally {
      setLoaded(true);
    }
  }

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: prefs })
        .eq('id', user.id);

      if (error) throw error;
      toast('success', t('settings.preferencesSaved'));
    } catch {
      toast('error', t('common.somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof NotificationPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    {
      title: t('settings.orderNotifications'),
      items: [
        { key: 'orderUpdates' as const, icon: <ShoppingBag className="w-5 h-5" />, label: t('settings.orderUpdates'), desc: t('settings.orderUpdatesDesc'), gradient: 'from-[#FF6B00] to-red-500' },
        { key: 'deliveryUpdates' as const, icon: <Truck className="w-5 h-5" />, label: t('settings.deliveryUpdates'), desc: t('settings.deliveryUpdatesDesc'), gradient: 'from-blue-500 to-indigo-500' },
        { key: 'promotions' as const, icon: <Tag className="w-5 h-5" />, label: t('settings.promotions'), desc: t('settings.promotionsDesc'), gradient: 'from-purple-500 to-pink-500' },
        { key: 'chatMessages' as const, icon: <MessageSquare className="w-5 h-5" />, label: t('settings.chatMessages'), desc: t('settings.chatMessagesDesc'), gradient: 'from-emerald-500 to-green-500' },
      ],
    },
    {
      title: t('settings.channelPreferences'),
      items: [
        { key: 'pushNotifications' as const, icon: <Smartphone className="w-5 h-5" />, label: t('settings.pushNotifications'), desc: t('settings.pushNotificationsDesc'), gradient: 'from-amber-500 to-orange-500' },
        { key: 'emailNotifications' as const, icon: <Mail className="w-5 h-5" />, label: t('settings.emailNotifications'), desc: t('settings.emailNotificationsDesc'), gradient: 'from-cyan-500 to-blue-500' },
        { key: 'soundEnabled' as const, icon: <Bell className="w-5 h-5" />, label: t('settings.soundEnabled'), desc: t('settings.soundEnabledDesc'), gradient: 'from-rose-500 to-red-500' },
      ],
    },
  ];

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-[#FF6B00]/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -left-32 w-64 h-64 bg-gradient-to-tr from-amber-300/8 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => router.push('/settings')}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('settings.notifications')}</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">{t('settings.manageNotifPrefs')}</p>
          </div>
        </motion.div>

        {/* Quick toggle all */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-4 mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shadow-md',
              Object.values(prefs).some(v => v) ? 'bg-gradient-to-br from-[#FF6B00] to-[#E55A00] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            )}>
              {Object.values(prefs).some(v => v) ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{t('settings.allNotifications')}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {Object.values(prefs).filter(v => v).length} / {Object.keys(prefs).length} {t('settings.enabled')}
              </p>
            </div>
          </div>
          <Toggle
            enabled={Object.values(prefs).some(v => v)}
            onToggle={() => {
              const allOn = Object.values(prefs).every(v => v);
              const newVal = !allOn;
              setPrefs(Object.keys(prefs).reduce((acc, key) => ({ ...acc, [key]: newVal }), defaultPrefs));
            }}
          />
        </motion.div>

        {/* Sections */}
        {sections.map((section, si) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + si * 0.1 }}
            className="mb-6"
          >
            <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 px-1">
              {section.title}
            </h3>
            <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 overflow-hidden divide-y divide-[var(--color-border)]/30">
              {section.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-4 p-4"
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md shrink-0',
                    item.gradient
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">{item.label}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">{item.desc}</p>
                  </div>
                  <Toggle enabled={prefs[item.key]} onToggle={() => toggle(item.key)} />
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Save */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#E55A00] text-white font-bold text-sm shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {t('settings.savePreferences')}
          </motion.button>
        </motion.div>
      </div>

      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
