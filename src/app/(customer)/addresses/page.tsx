'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MapPin, Plus, Trash2, Star, ChevronLeft,
  Home, Briefcase
} from 'lucide-react';
import { Button, Card, Input, Badge, Skeleton, EmptyState } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Address } from '@/types';

export default function AddressesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const user = useAppStore((s) => s.user);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchAddresses = async () => {
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        if (error) throw error;
        setAddresses(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load addresses');
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [user, router]);

  const handleAdd = async () => {
    if (!newLabel.trim() || !newAddress.trim() || !user) return;
    setSaving(true);
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          label: newLabel.trim(),
          address: newAddress.trim(),
          latitude: 0,
          longitude: 0,
          is_default: addresses.length === 0,
        })
        .select()
        .single();

      if (error) throw error;
      setAddresses((prev) => [...prev, data]);
      setNewLabel('');
      setNewAddress('');
      setShowForm(false);
      toast('success', 'Address added');
    } catch (err) {
      toast('error', 'Failed to add address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (address: Address) => {
    if (!window.confirm(`Delete "${address.label}"?`)) return;
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', address.id);

      if (error) throw error;
      setAddresses((prev) => prev.filter((a) => a.id !== address.id));
      toast('success', 'Address deleted');
    } catch (err) {
      toast('error', 'Failed to delete address');
    }
  };

  const handleSetDefault = async (address: Address) => {
    const supabase = createClient();
    try {
      const { error: resetError } = await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user!.id);

      if (resetError) throw resetError;

      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', address.id);

      if (error) throw error;

      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === address.id }))
      );
      toast('success', 'Default address updated');
    } catch (err) {
      toast('error', 'Failed to update default address');
    }
  };

  const labelIcon = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('home')) return <Home className="w-4 h-4" />;
    if (lower.includes('work') || lower.includes('office')) return <Briefcase className="w-4 h-4" />;
    return <MapPin className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<MapPin className="w-8 h-8 text-[var(--color-error)]" />}
          title="Something went wrong"
          description={error}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 max-w-lg mx-auto pb-32"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Addresses</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">{addresses.length} saved</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4 space-y-3">
          <Input
            label="Label"
            placeholder="e.g. Home, Work"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <Input
            label="Address"
            placeholder="Street, city, building..."
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={saving}
              onClick={handleAdd}
              disabled={!newLabel.trim() || !newAddress.trim()}
            >
              Save
            </Button>
          </div>
        </Card>
      )}

      {addresses.length === 0 && !showForm ? (
        <EmptyState
          icon={<MapPin className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No addresses saved"
          description="Add your delivery addresses for faster checkout"
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" />
              Add address
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {addresses.map((addr, index) => (
            <motion.div
              key={addr.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center shrink-0 text-[var(--color-primary)]">
                    {labelIcon(addr.label)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--color-text-primary)] text-sm">
                        {addr.label}
                      </span>
                      {addr.is_default && (
                        <Badge variant="primary" size="sm">Default</Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{addr.address}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefault(addr)}
                        className="p-2 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                        aria-label="Set as default"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(addr)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
                      aria-label={`Delete ${addr.label}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
