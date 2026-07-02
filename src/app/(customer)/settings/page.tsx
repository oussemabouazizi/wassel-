'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Globe, User, Bell, Shield, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Card, Button, Toggle, Select } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n';

const languages = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية' },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { language, setLanguage, theme, toggleTheme } = useAppStore();
  const { t } = useI18n();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 max-w-2xl mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('nav.settings')}</h1>

      <Card className="space-y-4">
        <h2 className="font-semibold text-[var(--color-text-primary)]">{t('settings.preferences')}</h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun className="w-5 h-5 text-[var(--color-text-secondary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('profile.darkMode')}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{t('settings.darkModeDesc')}</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
          >
            <div className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-[var(--color-text-secondary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('profile.language')}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{t('settings.languageDesc')}</p>
            </div>
          </div>
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'ar' | 'fr' | 'en')}
            options={languages}
            className="w-36"
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-[var(--color-text-primary)]">{t('settings.account')}</h2>

        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-3 w-full text-left py-2"
        >
          <User className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('nav.profile')}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{t('settings.profileDesc')}</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-3 w-full text-left py-2"
        >
          <Bell className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.notifications')}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{t('settings.notificationsDesc')}</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-3 w-full text-left py-2"
        >
          <Shield className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.privacySecurity')}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{t('settings.privacyDesc')}</p>
          </div>
        </button>
      </Card>

      <Button variant="danger" fullWidth onClick={handleLogout} className="!bg-red-500 hover:!bg-red-600">
        <LogOut className="w-4 h-4" />
        {t('nav.signOut')}
      </Button>
    </motion.div>
  );
}
