'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, Calendar, Package, ChevronDown,
  ArrowUpRight, Wallet, Receipt
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Card, Badge, Skeleton, EmptyState, Tabs } from '@/components/ui';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Order } from '@/types';

type Period = 'week' | 'month' | 'all';

export default function EarningsPage() {
  const supabase = createClient();
  const { user } = useAppStore();

  const [orders, setOrders] = useState<(Order & { stores: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('week');

  const getDateRange = (p: Period) => {
    const now = new Date();
    if (p === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return start.toISOString();
    }
    if (p === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return start.toISOString();
    }
    return '';
  };

  const fetchEarnings = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('orders')
      .select('*, stores(name)')
      .eq('delivery_person_id', user.id)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false });

    const dateStart = getDateRange(period);
    if (dateStart) {
      query = query.gte('created_at', dateStart);
    }

    const { data } = await query;
    if (data) setOrders(data as (Order & { stores: { name: string } })[]);
    setLoading(false);
  }, [user, supabase, period]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  const totalEarnings = orders.reduce((sum, o) => sum + o.delivery_fee + (o.tip || 0), 0);
  const totalTip = orders.reduce((sum, o) => sum + (o.tip || 0), 0);
  const avgPerDelivery = orders.length > 0 ? totalEarnings / orders.length : 0;

  const periodTabs = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 rounded-xl" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Earnings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Total Earnings</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatPrice(totalEarnings)}</p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Deliveries</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{orders.length}</p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Avg per Delivery</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatPrice(avgPerDelivery)}</p>
            </div>
          </Card>
        </motion.div>
      </div>

      <Tabs tabs={periodTabs.map(t => ({ id: t.id, label: t.label, icon: t.id === 'week' ? undefined : undefined }))} activeTab={period} onChange={(id) => setPeriod(id as Period)} />

      {orders.length === 0 ? (
        <EmptyState
          icon={<Wallet className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No earnings yet"
          description="Complete deliveries to start earning. Your earnings will appear here."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-5 h-5 text-[var(--color-primary)]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[var(--color-text-primary)]">{order.order_number}</span>
                    <Badge variant="success" size="sm">Delivered</Badge>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {order.stores?.name || 'Unknown'} &middot; {formatDate(order.created_at)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">{formatPrice(order.delivery_fee)}</p>
                  {order.tip > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400">+{formatPrice(order.tip)} tip</p>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
