'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Store as StoreIcon, Star, AlertTriangle, CheckCircle, XCircle, PauseCircle, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatPrice, cn } from '@/lib/utils';
import { notifyVendorStoreStatus } from '@/lib/notify';
import { Button, Input, Select, Badge, Avatar, Card, Skeleton, EmptyState, useToast, useConfirm } from '@/components/ui';
import type { Store, StoreStatus } from '@/types';

interface StoreWithOwner extends Store {
  profiles: { id: string; full_name: string; email: string };
  categories: { name: string };
}

const statusBadge: Record<StoreStatus, 'warning' | 'success' | 'danger' | 'gray'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  suspended: 'gray',
};

export default function AdminStores() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [stores, setStores] = useState<StoreWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      let query = supabase
        .from('stores')
        .select('*, profiles(full_name, email), categories(name)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setStores((data || []) as unknown as StoreWithOwner[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  async function updateStoreStatus(storeId: string, status: StoreStatus) {
    const shouldProceed = await confirm({
      title: `${status.charAt(0).toUpperCase() + status.slice(1)} Store`,
      message: `Are you sure you want to ${status} this store?`,
      confirmText: status === 'rejected' || status === 'suspended' ? 'Yes, proceed' : 'Approve',
      variant: status === 'rejected' || status === 'suspended' ? 'danger' : 'primary',
    });
    if (!shouldProceed) return;

    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from('stores')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', storeId);
      if (err) throw err;
      setStores((prev) => prev.map((s) => (s.id === storeId ? { ...s, status } : s)));
      toast('success', `Store ${status} successfully`);

      const store = stores.find((s) => s.id === storeId);
      if (store?.profiles?.id) {
        notifyVendorStoreStatus(store.name, status, store.profiles.id);
      }
    } catch (err: any) {
      toast('error', err.message);
    }
  }

  async function deleteStore(storeId: string, storeName: string) {
    const shouldProceed = await confirm({
      title: 'Delete Store',
      message: `Are you sure you want to permanently delete "${storeName}"? This will also delete all its products and orders. This cannot be undone.`,
      confirmText: 'Yes, delete permanently',
      variant: 'danger',
    });
    if (!shouldProceed) return;

    try {
      const supabase = createClient();
      await supabase.from('order_items').delete().in('order_id',
        (await supabase.from('orders').select('id').eq('store_id', storeId)).data?.map(o => o.id) || []
      );
      await supabase.from('orders').delete().eq('store_id', storeId);
      await supabase.from('products').delete().eq('store_id', storeId);
      const { error: err } = await supabase.from('stores').delete().eq('id', storeId);
      if (err) throw err;
      setStores((prev) => prev.filter((s) => s.id !== storeId));
      toast('success', 'Store deleted permanently');
    } catch (err: any) {
      toast('error', err.message);
    }
  }

  const statusActions: Record<StoreStatus, { label: string; variant: 'primary' | 'danger' | 'outline'; icon: React.ReactNode; nextStatus: StoreStatus }[]> = {
    pending: [
      { label: 'Approve', variant: 'primary', icon: <CheckCircle className="w-4 h-4" />, nextStatus: 'approved' },
      { label: 'Reject', variant: 'danger', icon: <XCircle className="w-4 h-4" />, nextStatus: 'rejected' },
    ],
    approved: [
      { label: 'Suspend', variant: 'outline', icon: <PauseCircle className="w-4 h-4" />, nextStatus: 'suspended' },
    ],
    suspended: [
      { label: 'Approve', variant: 'primary', icon: <CheckCircle className="w-4 h-4" />, nextStatus: 'approved' },
      { label: 'Reject', variant: 'danger', icon: <XCircle className="w-4 h-4" />, nextStatus: 'rejected' },
    ],
    rejected: [
      { label: 'Approve', variant: 'primary', icon: <CheckCircle className="w-4 h-4" />, nextStatus: 'approved' },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Stores</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Manage all stores on the platform</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search stores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          className="w-full sm:w-48"
        />
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="w-12 h-12 text-[var(--color-error)] mb-4" />
          <p className="text-[var(--color-error)] font-medium">{error}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <EmptyState
          icon={<StoreIcon className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No stores found"
          description={search ? 'Try a different search term' : 'No stores have been created yet'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map((store, i) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card>
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[var(--color-surface)] overflow-hidden flex-shrink-0">
                    {store.image_url ? (
                      <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <StoreIcon className="w-6 h-6 text-[var(--color-text-secondary)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-[var(--color-text-primary)] truncate">{store.name}</h3>
                        <p className="text-xs text-[var(--color-text-secondary)]">{store.categories?.name || 'Uncategorized'}</p>
                      </div>
                      <Badge variant={statusBadge[store.status]}>{store.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-secondary)]">
                      <div className="flex items-center gap-1">
                        <Avatar name={store.profiles?.full_name || 'Owner'} size="sm" />
                        <span>{store.profiles?.full_name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>{store.rating.toFixed(1)}</span>
                      </div>
                      <span>{store.total_orders} orders</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                  {statusActions[store.status].map((action) => (
                    <Button
                      key={action.nextStatus}
                      size="sm"
                      variant={action.variant}
                      onClick={() => updateStoreStatus(store.id, action.nextStatus)}
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => deleteStore(store.id, store.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
