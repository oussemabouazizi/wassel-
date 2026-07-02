'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { ToastProvider, ConfirmProvider } from '@/components/ui';
import { I18nProvider } from '@/i18n';
import type { UserRole } from '@/types';

export default function Providers({ children }: { children: ReactNode }) {
  const { setUser, toggleTheme } = useAppStore();
  const [savedLang, setSavedLang] = useState<'ar' | 'fr' | 'en'>('en');

  useEffect(() => {
    const savedTheme = localStorage.getItem('wassel-theme');
    if (savedTheme === 'dark' && useAppStore.getState().theme === 'light') {
      document.documentElement.classList.add('dark');
      useAppStore.setState({ theme: 'dark' });
    } else if (savedTheme !== 'dark' && useAppStore.getState().theme === 'dark') {
      useAppStore.setState({ theme: 'light' });
    }

    const lang = localStorage.getItem('wassel-language') as 'ar' | 'fr' | 'en' | null;
    if (lang) {
      setSavedLang(lang);
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const meta = session.user.user_metadata || {};
        setUser({
          id: session.user.id,
          email: session.user.email!,
          full_name: (meta.full_name as string) || session.user.email!.split('@')[0],
          phone: (meta.phone as string) || '',
          role: (meta.role as UserRole) || 'customer',
          avatar_url: null,
          is_active: true,
          language: (meta.language as 'ar' | 'fr' | 'en') || 'en',
          created_at: session.user.created_at,
          updated_at: session.user.created_at,
        });
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const meta = session.user.user_metadata || {};
          setUser({
            id: session.user.id,
            email: session.user.email!,
            full_name: (meta.full_name as string) || session.user.email!.split('@')[0],
            phone: (meta.phone as string) || '',
            role: (meta.role as UserRole) || 'customer',
            avatar_url: null,
            is_active: true,
            language: (meta.language as 'ar' | 'fr' | 'en') || 'en',
            created_at: session.user.created_at,
            updated_at: session.user.created_at,
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser]);

  return (
    <I18nProvider defaultLanguage={savedLang}>
      <ToastProvider>
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
