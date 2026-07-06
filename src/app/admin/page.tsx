'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  UsersRound, Store, ShoppingBag, DollarSign, TrendingUp,
  Clock, AlertTriangle, ChevronRight, BarChart3
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import { Badge, Skeleton } from '@/components/ui';
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
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center"
        >
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </motion.div>
        <p className="text-red-500 font-bold">{error}</p>
      </div>
    );
  }

  const statCards = [
    { label: t('admin.totalUsers'), value: stats?.totalUsers ?? 0, icon: UsersRound, gradient: 'from-blue-500 to-indigo-600' },
    { label: t('admin.stores'), value: stats?.totalStores ?? 0, icon: Store, gradient: 'from-purple-500 to-pink-600' },
    { label: t('admin.totalOrders'), value: stats?.totalOrders ?? 0, icon: ShoppingBag, gradient: 'from-[#FF6B00] to-red-500' },
    { label: t('admin.totalRevenue'), value: stats ? formatPrice(stats.totalRevenue) : '---', icon: DollarSign, gradient: 'from-emerald-500 to-green-600' },
  ];

  return (
    <div className="relative">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-[#FF6B00]/6 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-gradient-to-tr from-purple-300/6 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('admin.title')}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('admin.overviewSubtitle')}</p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
          >
            <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-4 hover:shadow-lg hover:shadow-black/5 hover:border-[#FF6B00]/20 transition-all duration-300 group">
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300',
                  card.gradient
                )}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[var(--color-text-primary)]">
                {loading ? <Skeleton className="h-8 w-20 rounded-lg" /> : card.value}
              </div>
              <p className="text-[11px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">{card.label}</p>
            </div>
          </motion.div>
        ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="lg:col-span-2 bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#FF6B00]" />
                {t('admin.recentOrders')}
              </h2>
              <Link
                href="/admin/orders"
                className="text-xs font-bold text-[#FF6B00] hover:underline flex items-center gap-1"
              >
                {t('common.viewAll')} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : stats!.recentOrders.length === 0 ? (
              <p className="text-[var(--color-text-secondary)] text-center py-8">{t('admin.noOrders')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]/50">
                      <th className="text-left py-3 px-2 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{t('admin.tableOrder')}</th>
                      <th className="text-left py-3 px-2 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{t('admin.tableCustomer')}</th>
                      <th className="text-left py-3 px-2 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{t('admin.tableStore')}</th>
                      <th className="text-left py-3 px-2 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{t('admin.tableStatus')}</th>
                      <th className="text-right py-3 px-2 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{t('admin.tableTotal')}</th>
                      <th className="text-right py-3 px-2 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{t('admin.tableDate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats!.recentOrders.map((order, i) => (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.03 }}
                        className="border-b border-[var(--color-border)]/30 hover:bg-[var(--color-surface)]/50 transition-colors"
                      >
                        <td className="py-3 px-2 font-bold text-[var(--color-text-primary)]">{order.order_number}</td>
                        <td className="py-3 px-2 text-[var(--color-text-secondary)]">{order.profiles?.full_name}</td>
                        <td className="py-3 px-2 text-[var(--color-text-secondary)]">{order.stores?.name}</td>
                        <td className="py-3 px-2">
                          <Badge variant={statusBadge[order.status]}>{order.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-extrabold text-[var(--color-primary)]">{formatPrice(order.total)}</td>
                        <td className="py-3 px-2 text-right text-[var(--color-text-secondary)] text-xs">{formatDate(order.created_at)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Pending Approval */}
            {stats && stats.pendingStores > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
              >
                <Link href="/admin/stores?status=pending">
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 hover:shadow-lg transition-all duration-300 group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">{t('admin.pendingApproval')}</p>
                        <p className="text-xl font-extrabold text-amber-600">{stats.pendingStores} {stats.pendingStores === 1 ? t('admin.store') : t('admin.storesPlural')}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Users by Role */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5"
            >
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <UsersRound className="w-5 h-5 text-[#FF6B00]" />
                {t('admin.usersByRole')}
              </h2>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats!.usersByRole.map((r, i) => {
                    const roleColors: Record<string, string> = {
                      customer: 'bg-blue-500',
                      vendor: 'bg-purple-500',
                      delivery: 'bg-emerald-500',
                      admin: 'bg-[#FF6B00]',
                    };
                    return (
                      <motion.div
                        key={r.role}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + i * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-border)]/20 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={cn('w-2.5 h-2.5 rounded-full', roleColors[r.role] || 'bg-gray-400')} />
                          <span className="text-sm font-bold capitalize text-[var(--color-text-primary)]">{r.role}</span>
                        </div>
                        <span className="text-lg font-extrabold text-[var(--color-text-primary)]">{r.count}</span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Orders Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5"
            >
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#FF6B00]" />
                {t('admin.orders')} <TrendingUp className="w-4 h-4 text-emerald-500" />
              </h2>
              {loading ? (
                <Skeleton className="h-24 w-full rounded-xl" />
              ) : stats!.ordersPerDay.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">{t('admin.noData')}</p>
              ) : (
                <div className="flex items-end gap-1 h-28">
                  {stats!.ordersPerDay.slice(-7).map((day, i) => {
                    const maxCount = Math.max(...stats!.ordersPerDay.map((d) => d.count), 1);
                    const height = (day.count / maxCount) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <span className="text-xs font-bold text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity">{day.count}</span>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(height, 8)}%` }}
                          transition={{ delay: 0.6 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className="w-full bg-gradient-to-t from-[#FF6B00] to-amber-400 rounded-t-lg"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
