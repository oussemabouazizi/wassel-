'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Save, LogOut, ChevronLeft } from 'lucide-react';
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
      toast('success', 'Profile updated');
    } catch (err) {
      toast('error', 'Failed to update profile');
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
      <div className="p-4">
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 max-w-lg mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
        </button>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('profile.title')}</h1>
      </div>

      <div className="flex flex-col items-center mb-8">
        <Avatar
          name={fullName || user.full_name || 'User'}
          size="xl"
          className="mb-4"
        />
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
          {fullName || user.full_name}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{user.email}</p>
      </div>

      <div className="space-y-4">
        <Card>
          <Input
            label="Full name"
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            icon={<User className="w-5 h-5" />}
          />
        </Card>

        <Card>
          <Input
            label="Email"
            value={user.email}
            disabled
            icon={<Mail className="w-5 h-5" />}
          />
        </Card>

        <Card>
          <Input
            label="Phone"
            placeholder="+216 XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            icon={<Phone className="w-5 h-5" />}
          />
        </Card>

        <Button
          fullWidth
          size="lg"
          isLoading={saving}
          onClick={handleSave}
          disabled={!fullName.trim()}
        >
          <Save className="w-5 h-5" />
          Save changes
        </Button>

        <Button
          variant="outline"
          fullWidth
          onClick={handleLogout}
          className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="w-5 h-5" />
          {t('auth.logout')}
        </Button>
      </div>
    </motion.div>
  );
}
