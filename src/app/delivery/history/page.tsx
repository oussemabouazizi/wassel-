'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, Store, Package, Search, ChevronDown, Filter, X, Calendar
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Card, Badge, Skeleton, EmptyState, Input } from '@/components/ui';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Order } from '@/types';

export default function HistoryPage() {
  const supabase = createClient();
  const { user } = useAppStore();

  const [orders, setOrders] = useState<(Order & { stores: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('orders')
      .select('*, stores(name)')
      .eq('delivery_person_id', user.id)
      .in('status', ['delivered', 'cancelled'])
      .order('created_at', { ascending: false });

    if (dateFilter) {
      const start = new Date(dateFilter);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateFilter);
      end.setHours(23, 59, 59, 999);
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }

    const { data } = await query;
    if (data) setOrders(data as (Order & { stores: { name: string } })[]);
    setLoading(false);
  }, [user, supabase, dateFilter]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = orders.filter((o) =>
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    (o.stores?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    o.delivery_address.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => (
    <Badge variant={status === 'delivered' ? 'success' : 'danger'} size="sm">
      {status === 'delivered' ? 'Delivered' : 'Cancelled'}
    </Badge>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Delivery History</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <Input
            placeholder="Search by order number, store..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] z-10" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-10 w-full sm:w-48"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No delivery history"
          description={search || dateFilter ? 'No results match your filters.' : 'You have no completed or cancelled deliveries yet.'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-[var(--color-primary)]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[var(--color-text-primary)]">{order.order_number}</span>
                    {statusBadge(order.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Store className="w-3.5 h-3.5" />
                      {order.stores?.name || 'Unknown'}
                    </span>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-[var(--color-text-secondary)]">Total</p>
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">{formatPrice(order.total)}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
