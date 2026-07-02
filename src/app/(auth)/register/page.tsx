'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowRight, Store, Truck, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button, Input } from '@/components/ui';
import { useToast } from '@/components/ui';
import type { UserRole } from '@/types';
import { useI18n } from '@/i18n';

const roles: { value: UserRole; labelKey: string; icon: React.ReactNode; descriptionKey: string }[] = [
  { value: 'customer', labelKey: 'auth.customer', icon: <ShoppingBag className="w-6 h-6" />, descriptionKey: 'auth.customerDesc' },
  { value: 'vendor', labelKey: 'auth.vendor', icon: <Store className="w-6 h-6" />, descriptionKey: 'auth.vendorDesc' },
  { value: 'delivery', labelKey: 'auth.deliveryPerson', icon: <Truck className="w-6 h-6" />, descriptionKey: 'auth.deliveryDesc' },
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
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] mb-6 transition-colors"
          >
            ← {t('nav.goBack')}
          </button>

          {step === 1 ? (
            <>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">{t('auth.createAccount')}</h1>
              <p className="text-[var(--color-text-secondary)] mb-6">{t('auth.selectRole')}</p>

              <div className="space-y-3">
                {roles.map((role) => (
                  <motion.button
                    key={role.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect(role.value)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-primary)]">
                      {role.icon}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-[var(--color-text-primary)]">{t(role.labelKey)}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">{t(role.descriptionKey)}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[var(--color-text-secondary)] ml-auto" />
                  </motion.button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('auth.signUp')}</h1>
                  <p className="text-[var(--color-text-secondary)] capitalize">{selectedRole} {t('auth.accountSuffix')}</p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-[var(--color-primary)] hover:underline font-medium"
                >
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
                      className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 appearance-none"
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
                      className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
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

                <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                  {t('auth.createAccount')}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Login Link */}
        <p className="text-center mt-6 text-[var(--color-text-secondary)]">
          {t('auth.hasAccount')}{' '}
          <Link href="/login" className="text-[var(--color-primary)] font-semibold hover:underline">
            {t('auth.signIn')}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
