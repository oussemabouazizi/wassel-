'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { Button, Input, Card, Skeleton, useToast } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';

export default function DeliverySettings() {
  const { toast } = useToast();
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      email: user.email || '',
    });
    setLoading(false);
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: form.full_name, phone: form.phone })
        .eq('id', user.id);
      if (error) throw error;
      toast('success', 'Profile updated');
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
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Manage your account settings</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Profile</h2>
          <div className="space-y-4">
            <Input label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input label="Email" value={form.email} disabled />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </Card>
      </motion.div>

      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={saving}>
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
