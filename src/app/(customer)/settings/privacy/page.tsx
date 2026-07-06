'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Shield, Eye, EyeOff, Download, Trash2, Lock, Globe, MapPin,
  UserX, AlertTriangle, Check, ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { useToast } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

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

export default function SettingsPrivacyPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAppStore((s) => s.user);
  const [shareLocation, setShareLocation] = useState(true);
  const [shareOnlineStatus, setShareOnlineStatus] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [dataExporting, setDataExporting] = useState(false);
  const [saving, setSaving] = useState(false);

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
        .select('privacy_settings')
        .eq('id', user.id)
        .single();

      if (data?.privacy_settings) {
        const ps = data.privacy_settings;
        if (ps.shareLocation !== undefined) setShareLocation(ps.shareLocation);
        if (ps.shareOnlineStatus !== undefined) setShareOnlineStatus(ps.shareOnlineStatus);
        if (ps.showActivity !== undefined) setShowActivity(ps.showActivity);
      }
    } catch {
      // Use defaults
    }
  }

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          privacy_settings: {
            shareLocation,
            shareOnlineStatus,
            showActivity,
          },
        })
        .eq('id', user.id);

      if (error) throw error;
      toast('success', t('settings.privacySaved'));
    } catch {
      toast('error', t('common.somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setDataExporting(true);
    const supabase = createClient();
    try {
      const [profileRes, ordersRes, addressesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('orders').select('*, stores(name), order_items(*, products(name))').eq('customer_id', user.id),
        supabase.from('addresses').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        profile: profileRes.data,
        orders: ordersRes.data,
        addresses: addressesRes.data,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wassel-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('success', t('settings.dataExported'));
    } catch {
      toast('error', t('common.somethingWentWrong'));
    } finally {
      setDataExporting(false);
    }
  };

  const sections = [
    {
      title: t('settings.locationPrivacy'),
      items: [
        {
          icon: <MapPin className="w-5 h-5" />,
          label: t('settings.shareLocation'),
          desc: t('settings.shareLocationDesc'),
          gradient: 'from-blue-500 to-indigo-500',
          enabled: shareLocation,
          onToggle: () => setShareLocation(!shareLocation),
        },
        {
          icon: <Globe className="w-5 h-5" />,
          label: t('settings.shareOnlineStatus'),
          desc: t('settings.shareOnlineStatusDesc'),
          gradient: 'from-emerald-500 to-green-500',
          enabled: shareOnlineStatus,
          onToggle: () => setShareOnlineStatus(!shareOnlineStatus),
        },
        {
          icon: <Eye className="w-5 h-5" />,
          label: t('settings.showActivity'),
          desc: t('settings.showActivityDesc'),
          gradient: 'from-purple-500 to-pink-500',
          enabled: showActivity,
          onToggle: () => setShowActivity(!showActivity),
        },
      ],
    },
  ];

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-[#FF6B00]/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -left-32 w-64 h-64 bg-gradient-to-tr from-emerald-300/8 to-transparent rounded-full blur-3xl" />
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
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('settings.privacySecurity')}</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">{t('settings.managePrivacy')}</p>
          </div>
        </motion.div>

        {/* Privacy toggles */}
        {sections.map((section, si) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + si * 0.1 }}
            className="mb-6"
          >
            <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 px-1">
              {section.title}
            </h3>
            <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 overflow-hidden divide-y divide-[var(--color-border)]/30">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center gap-4 p-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md shrink-0',
                    item.gradient
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">{item.label}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle enabled={item.enabled} onToggle={item.onToggle} />
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Save privacy */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
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
              <Check className="w-4 h-4" />
            )}
            {t('settings.savePrivacy')}
          </motion.button>
        </motion.div>

        {/* Data & Security */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 px-1">
            {t('settings.dataSecurity')}
          </h3>
          <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 overflow-hidden divide-y divide-[var(--color-border)]/30">
            {/* Export Data */}
            <button
              onClick={handleExportData}
              disabled={dataExporting}
              className="w-full flex items-center gap-4 p-4 hover:bg-[var(--color-surface)]/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-110 transition-transform">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-[var(--color-text-primary)]">{t('settings.exportData')}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{t('settings.exportDataDesc')}</p>
              </div>
              {dataExporting ? (
                <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
              )}
            </button>

            {/* Active Sessions */}
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--color-text-primary)]">{t('settings.activeSessions')}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{t('settings.activeSessionsDesc')}</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                1
              </span>
            </div>

            {/* Blocked Users */}
            <button className="w-full flex items-center gap-4 p-4 hover:bg-[var(--color-surface)]/50 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-110 transition-transform">
                <UserX className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-[var(--color-text-primary)]">{t('settings.blockedUsers')}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{t('settings.blockedUsersDesc')}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
            </button>
          </div>
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
