'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TicketPercent, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatPrice } from '@/lib/utils';
import { Button, Input, Textarea, Badge, Modal, Card, Toggle, Skeleton, EmptyState, useToast, useConfirm } from '@/components/ui';
import type { PromoCode } from '@/types';

interface PromoForm {
  code: string;
  description: string;
  discount_percent: number;
  discount_amount: number;
  max_uses: number;
  min_order: number;
  max_discount: number | null;
  valid_from: string;
  valid_until: string;
}

const defaultForm: PromoForm = {
  code: '',
  description: '',
  discount_percent: 0,
  discount_amount: 0,
  max_uses: 100,
  min_order: 0,
  max_discount: null,
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
};

export default function AdminPromotions() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<PromoForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchPromos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setPromos(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  async function handleCreate() {
    if (!form.code.trim()) {
      toast('error', 'Promo code is required');
      return;
    }
    try {
      setSaving(true);
      const supabase = createClient();
      const { error: err } = await supabase.from('promo_codes').insert({
        code: form.code.toUpperCase(),
        description: form.description,
        discount_percent: form.discount_percent,
        discount_amount: form.discount_amount,
        max_uses: form.max_uses,
        min_order: form.min_order,
        max_discount: form.max_discount || null,
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: new Date(form.valid_until).toISOString(),
        is_active: true,
        current_uses: 0,
      });
      if (err) throw err;
      toast('success', 'Promo code created');
      setShowModal(false);
      setForm(defaultForm);
      fetchPromos();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(promo: PromoCode) {
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from('promo_codes')
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id);
      if (err) throw err;
      setPromos((prev) => prev.map((p) => (p.id === promo.id ? { ...p, is_active: !p.is_active } : p)));
      toast('success', `Promo code ${promo.is_active ? 'deactivated' : 'activated'}`);
    } catch (err: any) {
      toast('error', err.message);
    }
  }

  async function handleDelete(promo: PromoCode) {
    const shouldDelete = await confirm({
      title: 'Delete Promo Code',
      message: `Are you sure you want to delete "${promo.code}"?`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    try {
      const supabase = createClient();
      const { error: err } = await supabase.from('promo_codes').delete().eq('id', promo.id);
      if (err) throw err;
      toast('success', 'Promo code deleted');
      fetchPromos();
    } catch (err: any) {
      toast('error', err.message);
    }
  }

  const isExpired = (date: string) => new Date(date) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Promotions</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Manage promo codes and discounts</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          New Promo Code
        </Button>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="w-12 h-12 text-[var(--color-error)] mb-4" />
          <p className="text-[var(--color-error)] font-medium">{error}</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : promos.length === 0 ? (
        <EmptyState
          icon={<TicketPercent className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No promo codes"
          description="Create your first promotional code"
          action={<Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> New Promo Code</Button>}
        />
      ) : (
        <div className="space-y-3">
          {promos.map((promo, i) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                      <TicketPercent className="w-6 h-6 text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg text-[var(--color-text-primary)]">{promo.code}</span>
                        <Badge variant={promo.is_active ? 'success' : 'gray'}>
                          {promo.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {isExpired(promo.valid_until) && <Badge variant="danger">Expired</Badge>}
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">{promo.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-[var(--color-text-secondary)]">
                        {promo.discount_percent > 0 && <span>{promo.discount_percent}% off</span>}
                        {promo.discount_amount > 0 && <span>{formatPrice(promo.discount_amount)} off</span>}
                        <span>Used: {promo.current_uses}/{promo.max_uses}</span>
                        {promo.min_order > 0 && <span>Min: {formatPrice(promo.min_order)}</span>}
                        <span>Valid until: {formatDate(promo.valid_until)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle checked={promo.is_active} onChange={() => toggleActive(promo)} />
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(promo)}>
                      <Trash2 className="w-4 h-4 text-[var(--color-error)]" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Promo Code">
        <div className="space-y-4">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE20" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Discount %" type="number" value={form.discount_percent.toString()} onChange={(e) => setForm({ ...form, discount_percent: parseFloat(e.target.value) || 0 })} />
            <Input label="Discount Amount (TND)" type="number" step="0.01" value={form.discount_amount.toString()} onChange={(e) => setForm({ ...form, discount_amount: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Max Uses" type="number" value={form.max_uses.toString()} onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value) || 0 })} />
            <Input label="Min Order (TND)" type="number" step="0.01" value={form.min_order.toString()} onChange={(e) => setForm({ ...form, min_order: parseFloat(e.target.value) || 0 })} />
          </div>
          <Input label="Max Discount (TND, optional)" type="number" step="0.01" value={form.max_discount?.toString() || ''} onChange={(e) => setForm({ ...form, max_discount: e.target.value ? parseFloat(e.target.value) : null })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valid From" type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
            <Input label="Valid Until" type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={saving}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
