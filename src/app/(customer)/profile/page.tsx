'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Save, LogOut, ChevronLeft, Shield, Camera } from 'lucide-react';
import { Button, Input, Card, Avatar, Skeleton } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { useToast } from '@/components/ui';
import { useI18n } from '@/i18n';

export default function ProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!initialized) {
      setFullName(user.full_name);
      setPhone(user.phone);
      setInitialized(true);
    }
  }, [user, router, initialized]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setUser({
        ...user,
        full_name: fullName.trim(),
        phone: phone.trim(),
      });
      toast('success', t('profile.updateSuccess'));
    } catch (err) {
      toast('error', t('profile.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Ambient background */}
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
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('profile.title')}</h1>
        </motion.div>

        {/* Profile header card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="relative mb-6 rounded-3xl overflow-hidden border border-[var(--color-border)]/50"
        >
          <div className="h-24 bg-gradient-to-br from-[#FF6B00] to-[#E55A00]" />
          <div className="px-6 pb-6 -mt-10">
            <div className="relative inline-block">
              <Avatar
                name={fullName || user.full_name || 'User'}
                size="xl"
                className="ring-4 ring-[var(--color-background)]"
              />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--color-background)] border-2 border-[var(--color-border)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                <Camera className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-3">
              {fullName || user.full_name}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{user.email}</p>
          </div>
        </motion.div>

        {/* Form */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Card className="p-0 overflow-hidden border border-[var(--color-border)]/50">
              <div className="p-4 space-y-4">
                <Input
                  label={t('auth.fullName')}
                  placeholder={t('profile.fullNamePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  icon={<User className="w-5 h-5" />}
                />
                <Input
                  label={t('auth.email')}
                  value={user.email}
                  disabled
                  icon={<Mail className="w-5 h-5" />}
                />
                <Input
                  label={t('auth.phone')}
                  placeholder={t('auth.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  icon={<Phone className="w-5 h-5" />}
                />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              fullWidth
              size="lg"
              isLoading={saving}
              onClick={handleSave}
              disabled={!fullName.trim()}
            >
              <Save className="w-5 h-5" />
              {t('profile.saveChanges')}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 dark:border-red-800/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold text-sm transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              {t('auth.logout')}
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
