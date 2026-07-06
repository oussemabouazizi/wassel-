'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Globe, User, Bell, Shield, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Button, Input } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

const languages = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'ar', label: 'العربية', flag: '🇹🇳' },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { language, setLanguage, theme, toggleTheme } = useAppStore();
  const { t } = useI18n();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const settingSections = [
    {
      title: t('settings.preferences'),
      items: [
        {
          icon: <Sun className="w-5 h-5" />,
          label: t('profile.darkMode'),
          desc: t('settings.darkModeDesc'),
          gradient: 'from-amber-500 to-orange-500',
          action: (
            <button
              onClick={toggleTheme}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors duration-300',
                theme === 'dark' ? 'bg-gradient-to-r from-[#FF6B00] to-[#E55A00]' : 'bg-[var(--color-border)]'
              )}
            >
              <motion.div
                className="absolute w-5 h-5 rounded-full bg-white top-0.5 shadow-md"
                animate={{ x: theme === 'dark' ? 26 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          ),
        },
        {
          icon: <Globe className="w-5 h-5" />,
          label: t('profile.language'),
          desc: languages.find(l => l.value === language)?.label || 'English',
          gradient: 'from-blue-500 to-indigo-500',
          action: (
            <button
              onClick={() => setShowLanguagePicker(!showLanguagePicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/50 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30 transition-colors"
            >
              <span>{languages.find(l => l.value === language)?.flag}</span>
              <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', showLanguagePicker && 'rotate-90')} />
            </button>
          ),
        },
      ],
    },
    {
      title: t('settings.account'),
      items: [
        {
          icon: <User className="w-5 h-5" />,
          label: t('nav.profile'),
          desc: t('settings.profileDesc'),
          gradient: 'from-purple-500 to-pink-500',
          action: <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />,
          onClick: () => router.push('/settings/profile'),
        },
        {
          icon: <Bell className="w-5 h-5" />,
          label: t('settings.notifications'),
          desc: t('settings.notificationsDesc'),
          gradient: 'from-[#FF6B00] to-red-500',
          action: <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />,
          onClick: () => router.push('/settings/notifications'),
        },
        {
          icon: <Shield className="w-5 h-5" />,
          label: t('settings.privacySecurity'),
          desc: t('settings.privacyDesc'),
          gradient: 'from-emerald-500 to-teal-500',
          action: <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />,
          onClick: () => router.push('/settings/privacy'),
        },
      ],
    },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-[#FF6B00]/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -left-32 w-64 h-64 bg-gradient-to-tr from-purple-300/8 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('nav.settings')}</h1>
        </motion.div>

        {/* Settings sections */}
        <div className="space-y-6">
          {settingSections.map((section, si) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + si * 0.1, duration: 0.5 }}
            >
              <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 px-1">
                {section.title}
              </h3>
              <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 overflow-hidden divide-y divide-[var(--color-border)]/30">
                {section.items.map((item, ii) => (
                  <div
                    key={item.label}
                    onClick={item.onClick}
                    role={item.onClick ? 'button' : undefined}
                    tabIndex={item.onClick ? 0 : undefined}
                    onKeyDown={item.onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') item.onClick?.(); } : undefined}
                    className="w-full flex items-center gap-4 p-4 hover:bg-[var(--color-surface)]/50 transition-colors group"
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-110 transition-transform duration-300',
                      item.gradient
                    )}>
                      {item.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-[var(--color-text-primary)]">{item.label}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{item.desc}</p>
                    </div>
                    {item.action}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Language picker dropdown */}
          {showLanguagePicker && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 overflow-hidden"
            >
              <div className="p-2">
                {languages.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => {
                      setLanguage(lang.value as 'ar' | 'fr' | 'en');
                      setShowLanguagePicker(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                      language === lang.value
                        ? 'bg-[#FF6B00]/10 border border-[#FF6B00]/20'
                        : 'hover:bg-[var(--color-surface)]'
                    )}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className={cn(
                      'text-sm font-medium',
                      language === lang.value ? 'text-[#FF6B00] font-bold' : 'text-[var(--color-text-primary)]'
                    )}>
                      {lang.label}
                    </span>
                    {language === lang.value && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-[#FF6B00]" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Logout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 dark:border-red-800/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-sm transition-all duration-200 group"
            >
              <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              {t('nav.signOut')}
            </button>
          </motion.div>
        </div>
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
