'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronLeft, User, Mail, Phone, Lock, Eye, EyeOff,
  Save, Trash2, Camera, AlertTriangle, Check
} from 'lucide-react';
import { Button, Input, Skeleton } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { useToast } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export default function SettingsProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const handleSaveProfile = async () => {
    if (!user || !fullName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() })
        .eq('id', user.id);

      if (error) throw error;
      setUser({ ...user, full_name: fullName.trim(), phone: phone.trim() });
      toast('success', t('profile.updateSuccess'));
    } catch {
      toast('error', t('profile.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      toast('error', t('auth.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      toast('error', t('auth.passwordMinLength'));
      return;
    }

    setChangingPassword(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        if (error.message.includes('password')) {
          toast('error', t('settings.currentPasswordIncorrect'));
        } else {
          throw error;
        }
        return;
      }
      toast('success', t('settings.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch {
      toast('error', t('common.somethingWentWrong'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE' || !user) return;
    setDeleting(true);
    const supabase = createClient();
    try {
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.signOut();
      setUser(null);
      toast('success', t('settings.accountDeleted'));
      router.push('/');
    } catch {
      toast('error', t('common.somethingWentWrong'));
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
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
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => router.push('/settings')}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('nav.profile')}</h1>
        </motion.div>

        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="relative mb-6 rounded-3xl overflow-hidden border border-[var(--color-border)]/50"
        >
          <div className="h-24 bg-gradient-to-br from-[#FF6B00] to-[#E55A00]" />
          <div className="px-6 pb-6 -mt-10">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#E55A00] flex items-center justify-center text-white text-2xl font-extrabold ring-4 ring-[var(--color-background)] shadow-lg">
                {(fullName || user.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--color-background)] border-2 border-[var(--color-border)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                <Camera className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-3">
              {fullName || user.full_name}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{user.email}</p>
          </div>
        </motion.div>

        {/* Edit Profile */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5 mb-4"
        >
          <h3 className="font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-[#FF6B00]" />
            {t('settings.editProfile')}
          </h3>
          <div className="space-y-4">
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
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveProfile}
            disabled={saving || !fullName.trim()}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E55A00] text-white font-bold text-sm shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {t('profile.saveChanges')}
          </motion.button>
        </motion.div>

        {/* Change Password */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5 mb-4"
        >
          <button
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#FF6B00]" />
              {t('settings.changePassword')}
            </h3>
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              showPasswordSection ? 'bg-[#FF6B00]/10' : 'bg-[var(--color-surface)]'
            )}>
              <ChevronLeft className={cn('w-4 h-4 text-[var(--color-text-secondary)] transition-transform', showPasswordSection && '-rotate-90')} />
            </div>
          </button>

          {showPasswordSection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 space-y-3"
            >
              <Input
                label={t('settings.currentPassword')}
                type={showCurrentPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                icon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="text-[var(--color-text-secondary)]">
                    {showCurrentPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
              <Input
                label={t('settings.newPassword')}
                type={showNewPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="text-[var(--color-text-secondary)]">
                    {showNewPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
              <Input
                label={t('auth.confirmPassword')}
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-5 h-5" />}
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {t('auth.passwordMismatch')}
                </p>
              )}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E55A00] text-white font-bold text-sm shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all"
              >
                {changingPassword ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {t('settings.updatePassword')}
              </motion.button>
            </motion.div>
          )}
        </motion.div>

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5 mb-4"
        >
          <h3 className="font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#FF6B00]" />
            {t('settings.accountInfo')}
          </h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]/30">
              <span className="text-[var(--color-text-secondary)]">{t('auth.email')}</span>
              <span className="font-medium text-[var(--color-text-primary)]">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]/30">
              <span className="text-[var(--color-text-secondary)]">{t('settings.memberSince')}</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {new Date(user.created_at || Date.now()).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[var(--color-text-secondary)]">{t('auth.phone')}</span>
              <span className="font-medium text-[var(--color-text-primary)]">{phone || '—'}</span>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800/30 p-5"
        >
          <h3 className="font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            {t('settings.dangerZone')}
          </h3>
          <p className="text-xs text-red-500/80 dark:text-red-400/70 mb-4">
            {t('settings.deleteAccountDesc')}
          </p>

          {!showDeleteConfirm ? (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 rounded-xl border border-red-300 dark:border-red-700 text-red-500 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
            >
              {t('settings.deleteAccount')}
            </motion.button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                {t('settings.typeDeleteConfirm')}
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-red-950/30 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {t('settings.confirmDelete')}
                </motion.button>
              </div>
            </div>
          )}
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
