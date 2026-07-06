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
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] px-4 py-8 relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-[#FF6B00]/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-amber-300/10 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-8"
        >
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-[#E55A00] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <span className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">Wassel</span>
          </Link>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-[var(--color-background)] rounded-3xl shadow-2xl shadow-black/5 p-8 border border-[var(--color-border)]/50"
        >
          <button
            onClick={() => router.back()}
            className="mb-6 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-1.5 text-sm font-medium transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">&larr;</span>
            {t('nav.goBack')}
          </button>

          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight mb-1">{t('auth.welcomeBack')}</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">{t('auth.signInSubtitle')}</p>
          </div>

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
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
              required
            />

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-[#FF6B00] hover:underline font-medium"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                {t('auth.signIn')}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>
          </form>
        </motion.div>

        {/* Sign up link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6 text-sm text-[var(--color-text-secondary)]"
        >
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="text-[#FF6B00] font-bold hover:underline">
            {t('auth.signUp')}
          </Link>
        </motion.p>
      </motion.div>

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
