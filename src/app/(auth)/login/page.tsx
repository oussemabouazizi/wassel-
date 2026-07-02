'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button, Input } from '@/components/ui';
import { useToast } from '@/components/ui';
import { useI18n } from '@/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error(t('auth.userNotFound'));

      const role = (data.user.user_metadata?.role as string) || 'customer';
      toast('success', t('auth.loginSuccess'));

      switch (role) {
        case 'admin':
          router.push('/admin');
          break;
        case 'vendor':
          router.push('/vendor');
          break;
        case 'delivery':
          router.push('/delivery');
          break;
        default:
          router.push('/stores');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('auth.loginFailed');
      toast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <span className="text-2xl font-bold text-[var(--color-text-primary)]">Wassel</span>
          </Link>
        </div>

        <div className="bg-[var(--color-background)] rounded-2xl shadow-xl p-8 border border-[var(--color-border)]">
          <button onClick={() => router.back()} className="mb-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1 text-sm">
            ← {t('nav.goBack')}
          </button>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">{t('auth.welcomeBack')}</h1>
          <p className="text-[var(--color-text-secondary)] mb-6">{t('auth.signInSubtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('auth.email')}
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-5 h-5" />}
              required
            />

            <Input
              label={t('auth.password')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-5 h-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
              required
            />

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-[var(--color-primary)] hover:underline font-medium"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
              {t('auth.signIn')}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>
        </div>

        <p className="text-center mt-6 text-[var(--color-text-secondary)]">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="text-[var(--color-primary)] font-semibold hover:underline">
            {t('auth.signUp')}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
