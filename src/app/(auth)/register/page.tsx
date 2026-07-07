'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowRight, Store, Truck, ShoppingBag, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button, Input } from '@/components/ui';
import { useToast } from '@/components/ui';
import type { UserRole } from '@/types';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

const roles: { value: UserRole; labelKey: string; icon: React.ReactNode; descriptionKey: string; gradient: string }[] = [
  { value: 'customer', labelKey: 'auth.customer', icon: <ShoppingBag className="w-6 h-6" />, descriptionKey: 'auth.customerDesc', gradient: 'from-blue-500 to-blue-600' },
  { value: 'vendor', labelKey: 'auth.vendor', icon: <Store className="w-6 h-6" />, descriptionKey: 'auth.vendorDesc', gradient: 'from-purple-500 to-purple-600' },
  { value: 'delivery', labelKey: 'auth.deliveryPerson', icon: <Truck className="w-6 h-6" />, descriptionKey: 'auth.deliveryDesc', gradient: 'from-[#FF6B00] to-[#E55A00]' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    vehicleType: 'bike',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast('error', t('auth.passwordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      toast('error', t('auth.passwordMinLength'));
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            role: selectedRole,
          },
        },
      });

      if (error) {
        if (error.message?.includes('already') || error.status === 422) {
          throw new Error(t('auth.emailAlreadyRegistered'));
        }
        throw error;
      }

      if (data.user) {
        if (selectedRole === 'delivery') {
          await supabase.from('delivery_persons').insert({
            user_id: data.user.id,
            vehicle_type: formData.vehicleType,
            vehicle_plate: 'PENDING',
            id_document_url: 'pending',
            license_document_url: 'pending',
            status: 'approved',
            online_status: 'offline',
          });
        }
        if (selectedRole === 'vendor') {
          const { data: cats } = await supabase.from('categories').select('id').limit(1);
          if (cats && cats.length > 0) {
            await supabase.from('stores').insert({
              owner_id: data.user.id,
              name: formData.fullName + "'s Store",
              category_id: cats[0].id,
              description: '',
              status: 'pending',
              rating: 0,
              total_orders: 0,
              total_reviews: 0,
              delivery_fee: 3.5,
              estimated_delivery_time: 30,
              min_order: 10,
              is_open: true,
            });
          }
        }
        toast('success', t('auth.registerSuccess'));
        router.push('/');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('auth.registerFailed');
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
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-purple-300/10 to-transparent rounded-full blur-3xl" />
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
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-orange-500/30">
              <img src="/logo-original.jpeg" alt="Wassel" className="w-full h-full object-cover" />
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

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight mb-1">{t('auth.createAccount')}</h1>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">{t('auth.selectRole')}</p>

                <div className="space-y-3">
                  {roles.map((role, i) => (
                    <motion.button
                      key={role.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleRoleSelect(role.value)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--color-border)]/60 hover:border-[#FF6B00]/40 hover:bg-[#FF6B00]/5 transition-all duration-300 group"
                    >
                      <div className={cn(
                        'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110',
                        role.gradient
                      )}>
                        {role.icon}
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="font-bold text-[var(--color-text-primary)]">{t(role.labelKey)}</h3>
                        <p className="text-xs text-[var(--color-text-secondary)]">{t(role.descriptionKey)}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[var(--color-text-secondary)] group-hover:text-[#FF6B00] group-hover:translate-x-1 transition-all" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('auth.signUp')}</h1>
                    <p className="text-sm text-[var(--color-text-secondary)] capitalize">{selectedRole} {t('auth.accountSuffix')}</p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-sm text-[#FF6B00] hover:underline font-bold transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('auth.changeRole')}
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label={t('auth.fullName')}
                    placeholder={t('auth.fullNamePlaceholder')}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    icon={<User className="w-5 h-5" />}
                    required
                  />

                  {selectedRole === 'delivery' && (
                    <div className="w-full">
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">{t('delivery.vehicleType')}</label>
                      <select
                        value={formData.vehicleType}
                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all duration-200 appearance-none"
                      >
                        <option value="bike">🚲 {t('delivery.bike')}</option>
                        <option value="motorcycle">🏍️ {t('delivery.motorcycle')}</option>
                        <option value="car">🚗 {t('delivery.car')}</option>
                        <option value="scooter">🛵 {t('delivery.scooter')}</option>
                      </select>
                    </div>
                  )}

                  <Input
                    label={t('auth.email')}
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    icon={<Mail className="w-5 h-5" />}
                    required
                  />

                  <Input
                    label={t('auth.phone')}
                    type="tel"
                    placeholder={t('auth.phonePlaceholder')}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    icon={<Phone className="w-5 h-5" />}
                    required
                  />

                  <Input
                    label={t('auth.password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                  <Input
                    label={t('auth.confirmPassword')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    icon={<Lock className="w-5 h-5" />}
                    required
                  />

                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                      {t('auth.createAccount')}
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Login Link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6 text-sm text-[var(--color-text-secondary)]"
        >
          {t('auth.hasAccount')}{' '}
          <Link href="/login" className="text-[#FF6B00] font-bold hover:underline">
            {t('auth.signIn')}
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
