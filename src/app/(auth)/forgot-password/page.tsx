'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button, Input } from '@/components/ui';
import { useToast } from '@/components/ui';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      setIsSent(true);
      toast('success', 'Password reset email sent!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
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
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <span className="text-2xl font-bold text-[var(--color-text-primary)]">Wassel</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-background)] rounded-2xl shadow-xl p-8 border border-[var(--color-border)]">
          {isSent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Check your email</h1>
              <p className="text-[var(--color-text-secondary)] mb-6">
                We&apos;ve sent a password reset link to <strong>{email}</strong>
              </p>
              <Link href="/login">
                <Button variant="outline" fullWidth>
                  <ArrowLeft className="w-5 h-5" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Forgot Password?</h1>
              <p className="text-[var(--color-text-secondary)] mb-6">
                Enter your email and we&apos;ll send you a reset link
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="w-5 h-5" />}
                  required
                />

                <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                  Send Reset Link
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Back to Login */}
        {!isSent && (
          <p className="text-center mt-6 text-[var(--color-text-secondary)]">
            <Link href="/login" className="text-[var(--color-primary)] font-semibold hover:underline inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
