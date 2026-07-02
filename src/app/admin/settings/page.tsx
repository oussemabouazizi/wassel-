'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { Button, Input, Textarea, Card, useToast } from '@/components/ui';

export default function AdminSettings() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    deliveryFeeDefault: '3.50',
    minOrderAmount: '10.00',
    contactEmail: 'support@wassel.tn',
    aboutText: 'Wassel is a delivery platform connecting customers with local stores and restaurants.',
    currency: 'TND',
    commissionPercent: '15',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast('success', 'Settings saved successfully');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Configure platform settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">General Settings</h2>
            <div className="space-y-4">
              <Input
                label="Default Delivery Fee (TND)"
                type="number"
                step="0.01"
                value={form.deliveryFeeDefault}
                onChange={(e) => setForm({ ...form, deliveryFeeDefault: e.target.value })}
              />
              <Input
                label="Minimum Order Amount (TND)"
                type="number"
                step="0.01"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
              />
              <Input
                label="Commission Percentage"
                type="number"
                step="0.5"
                value={form.commissionPercent}
                onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })}
              />
              <Input
                label="Currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Contact & Info</h2>
            <div className="space-y-4">
              <Input
                label="Support Email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
              <Textarea
                label="About the Platform"
                value={form.aboutText}
                onChange={(e) => setForm({ ...form, aboutText: e.target.value })}
                rows={4}
              />
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={saving}>
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
