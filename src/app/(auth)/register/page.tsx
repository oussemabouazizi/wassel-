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

const roles: { value: UserRole; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'customer', label: 'Customer', icon: <ShoppingBag className="w-6 h-6" />, description: 'Order food & items' },
  { value: 'vendor', label: 'Vendor', icon: <Store className="w-6 h-6" />, description: 'Sell your products' },
  { value: 'delivery', label: 'Delivery', icon: <Truck className="w-6 h-6" />, description: 'Deliver orders' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
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
      toast('error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast('error', 'Password must be at least 6 characters');
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
          throw new Error('This email is already registered. Try logging in.');
        }
        throw error;
      }

      if (data.user) {
        if (selectedRole === 'delivery') {
          await supabase.from('delivery_persons').insert({
            user_id: data.user.id,
            vehicle_type: 'bike',
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
        toast('success', 'Account created! Welcome to Wassel.');
        router.push('/');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
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
          {step === 1 ? (
            <>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Create Account</h1>
              <p className="text-[var(--color-text-secondary)] mb-6">I am a...</p>

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
                      <h3 className="font-semibold text-[var(--color-text-primary)]">{role.label}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">{role.description}</p>
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
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Sign Up</h1>
                  <p className="text-[var(--color-text-secondary)] capitalize">{selectedRole} account</p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-[var(--color-primary)] hover:underline font-medium"
                >
                  Change
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  icon={<User className="w-5 h-5" />}
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  icon={<Mail className="w-5 h-5" />}
                  required
                />

                <Input
                  label="Phone"
                  type="tel"
                  placeholder="+216 XX XXX XXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  icon={<Phone className="w-5 h-5" />}
                  required
                />

                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
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
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  icon={<Lock className="w-5 h-5" />}
                  required
                />

                <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Login Link */}
        <p className="text-center mt-6 text-[var(--color-text-secondary)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--color-primary)] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
