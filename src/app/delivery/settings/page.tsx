'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { Button, Input, Card, Skeleton, useToast } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { useI18n } from '@/i18n';

export default function DeliverySettings() {
  const { toast } = useToast();
  const { t } = useI18n();
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    vehicle_type: 'bike',
    vehicle_plate: '',
  });

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const load = async () => {
      setForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        email: user.email || '',
        vehicle_type: 'bike',
        vehicle_plate: '',
      });

      const { data: dp } = await supabase
        .from('delivery_persons')
        .select('vehicle_type, vehicle_plate')
        .eq('user_id', user.id)
        .maybeSingle();

      if (dp) {
        setForm(prev => ({
          ...prev,
          vehicle_type: dp.vehicle_type || 'bike',
          vehicle_plate: dp.vehicle_plate || '',
        }));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ full_name: form.full_name, phone: form.phone })
        .eq('id', user.id);
      if (profileErr) throw profileErr;

      const { error: dpErr } = await supabase
        .from('delivery_persons')
        .update({ vehicle_type: form.vehicle_type, vehicle_plate: form.vehicle_plate })
        .eq('user_id', user.id);
      if (dpErr) throw dpErr;

      toast('success', t('delivery.settingsUpdated'));
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('nav.settings')}</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">{t('delivery.settingsSubtitle')}</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('nav.profile')}</h2>
          <div className="space-y-4">
            <Input label={t('auth.fullName')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input label={t('auth.email')} value={form.email} disabled />
            <Input label={t('auth.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('delivery.vehicle')}</h2>
          <div className="space-y-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">{t('delivery.vehicleType')}</label>
              <select
                value={form.vehicle_type}
                onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 appearance-none"
              >
                <option value="bike">🚲 {t('delivery.bike')}</option>
                <option value="motorcycle">🏍️ {t('delivery.motorcycle')}</option>
                <option value="car">🚗 {t('delivery.car')}</option>
                <option value="scooter">🛵 {t('delivery.scooter')}</option>
              </select>
            </div>
            <Input label={t('delivery.licensePlate')} placeholder={t('delivery.licensePlatePlaceholder')} value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} />
          </div>
        </Card>
      </motion.div>

      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={saving}>
          <Save className="w-4 h-4" />
          {t('profile.saveChanges')}
        </Button>
      </div>
    </div>
  );
}
