'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  UsersRound, Store, ShoppingBag, DollarSign, TrendingUp,
  Clock, AlertTriangle, ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import { Card, Badge, Skeleton } from '@/components/ui';
import type { OrderStatus } from '@/types';
import { useI18n } from '@/i18n';

interface DashboardStats {
  totalUsers: number;
  totalStores: number;
  totalOrders: number;
  totalRevenue: number;
  pendingStores: number;
  usersByRole: { role: string; count: number }[];
  recentOrders: {
    id: string;
    order_number: string;
    status: OrderStatus;
    total: number;
    created_at: string;
    profiles: { full_name: string } | null;
    stores: { name: string } | null;
  }[];
  ordersPerDay: { date: string; count: number }[];
}

const statusBadge = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'info',
  ready: 'info',
  picked_up: 'primary',
  on_the_way: 'primary',
  delivered: 'success',
  cancelled: 'danger',
} as const;

export default function AdminDashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStats(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-12 h-12 text-[var(--color-error)] mb-4" />
        <p className="text-[var(--color-error)] font-medium">{error}</p>
      </div>
    );
  }

  const statCards = [
    { label: t('admin.totalUsers'), value: stats?.totalUsers ?? 0, icon: UsersRound, color: 'bg-blue-500' },
    { label: t('admin.stores'), value: stats?.totalStores ?? 0, icon: Store, color: 'bg-purple-500' },
    { label: t('admin.totalOrders'), value: stats?.totalOrders ?? 0, icon: ShoppingBag, color: 'bg-[var(--color-primary)]' },
    { label: t('admin.totalRevenue'), value: stats ? formatPrice(stats.totalRevenue) : '---', icon: DollarSign, color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('admin.title')}</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">{t('admin.overviewSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', card.color)}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{card.label}</p>
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {loading ? <Skeleton className="h-8 w-20" /> : card.value}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('admin.recentOrders')}</h2>
              <Link
                href="/admin/orders"
                className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats!.recentOrders.length === 0 ? (
              <p className="text-[var(--color-text-secondary)] text-center py-8">{t('admin.noOrders')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-3 px-2 text-[var(--color-text-secondary)] font-medium">{t('admin.tableOrder')}</th>
                      <th className="text-left py-3 px-2 text-[var(--color-text-secondary)] font-medium">{t('admin.tableCustomer')}</th>
                      <th className="text-left py-3 px-2 text-[var(--color-text-secondary)] font-medium">{t('admin.tableStore')}</th>
                      <th className="text-left py-3 px-2 text-[var(--color-text-secondary)] font-medium">{t('admin.tableStatus')}</th>
                      <th className="text-right py-3 px-2 text-[var(--color-text-secondary)] font-medium">{t('admin.tableTotal')}</th>
                      <th className="text-right py-3 px-2 text-[var(--color-text-secondary)] font-medium">{t('admin.tableDate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats!.recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors">
                        <td className="py-3 px-2 font-medium text-[var(--color-text-primary)]">{order.order_number}</td>
                        <td className="py-3 px-2 text-[var(--color-text-secondary)]">{order.profiles?.full_name}</td>
                        <td className="py-3 px-2 text-[var(--color-text-secondary)]">{order.stores?.name}</td>
                        <td className="py-3 px-2">
                          <Badge variant={statusBadge[order.status]}>{order.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right text-[var(--color-text-primary)] font-medium">{formatPrice(order.total)}</td>
                        <td className="py-3 px-2 text-right text-[var(--color-text-secondary)] text-xs">{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {stats && stats.pendingStores > 0 && (
            <Link href="/admin/stores?status=pending">
              <Card hover>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('admin.pendingApproval')}</p>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">{stats.pendingStores} {stats.pendingStores === 1 ? t('admin.store') : t('admin.storesPlural')}</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}

          <Card>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('admin.usersByRole')}</h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {stats!.usersByRole.map((r) => (
                  <div key={r.role} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-[var(--color-text-secondary)]">{r.role}</span>
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              {t('admin.orders')} <TrendingUp className="w-4 h-4 inline text-[var(--color-primary)]" />
            </h2>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : stats!.ordersPerDay.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">{t('admin.noData')}</p>
            ) : (
              <div className="flex items-end gap-1 h-24">
                {stats!.ordersPerDay.slice(-7).map((day, i) => {
                  const maxCount = Math.max(...stats!.ordersPerDay.map((d) => d.count), 1);
                  const height = (day.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-[var(--color-text-secondary)]">{day.count}</span>
                      <div
                        className="w-full bg-[var(--color-primary)] rounded-t-sm transition-all"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
