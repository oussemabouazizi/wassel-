'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, DollarSign, ShoppingBag, TrendingUp, UsersRound, Award, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';
import { Card, Skeleton, Badge } from '@/components/ui';

interface ReportStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  newUsersThisMonth: number;
  topStores: { id: string; name: string; total_orders: number; rating: number; total_revenue?: number }[];
  ordersByStatus: { status: string; count: number }[];
}

export default function AdminReports() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [ordersRes, profilesRes, storesRes] = await Promise.all([
        supabase.from('orders').select('total, status, created_at'),
        supabase.from('profiles').select('created_at').gte('created_at', startOfMonth),
        supabase.from('stores').select('id, name, total_orders, rating').order('total_orders', { ascending: false }).limit(10),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (storesRes.error) throw storesRes.error;

      const delivered = (ordersRes.data || []).filter((o) => o.status === 'delivered');
      const totalRevenue = delivered.reduce((sum, o) => sum + o.total, 0);
      const totalOrders = ordersRes.data?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const statusCount: Record<string, number> = {};
      (ordersRes.data || []).forEach((o) => {
        statusCount[o.status] = (statusCount[o.status] || 0) + 1;
      });
      const ordersByStatus = Object.entries(statusCount).map(([status, count]) => ({ status, count }));

      const topStores = (storesRes.data || []).map((s) => ({
        id: s.id,
        name: s.name,
        total_orders: s.total_orders,
        rating: s.rating,
      }));

      setStats({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        newUsersThisMonth: profilesRes.data?.length || 0,
        topStores,
        ordersByStatus,
      });
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

  const summaryCards = [
    { label: 'Total Revenue', value: stats ? formatPrice(stats.totalRevenue) : '---', icon: DollarSign, color: 'bg-green-500' },
    { label: 'Total Orders', value: stats?.totalOrders ?? 0, icon: ShoppingBag, color: 'bg-[var(--color-primary)]' },
    { label: 'Avg Order Value', value: stats ? formatPrice(stats.avgOrderValue) : '---', icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'New Users (Month)', value: stats?.newUsersThisMonth ?? 0, icon: UsersRound, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Reports</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Platform performance overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
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
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {loading ? <Skeleton className="h-8 w-20" /> : card.value}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            <ShoppingBag className="w-5 h-5 inline mr-2 text-[var(--color-primary)]" />
            Orders by Status
          </h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : stats!.ordersByStatus.length === 0 ? (
            <p className="text-[var(--color-text-secondary)] text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {stats!.ordersByStatus.map((item) => {
                const total = stats!.totalOrders;
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize text-[var(--color-text-secondary)]">{item.status.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-[var(--color-text-primary)]">{item.count}</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface)] rounded-full h-2">
                      <div
                        className="bg-[var(--color-primary)] rounded-full h-2 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            <Award className="w-5 h-5 inline mr-2 text-yellow-500" />
            Top Performing Stores
          </h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : stats!.topStores.length === 0 ? (
            <p className="text-[var(--color-text-secondary)] text-center py-8">No stores yet</p>
          ) : (
            <div className="space-y-3">
              {stats!.topStores.map((store, i) => (
                <div key={store.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white',
                      i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                    )}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{store.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-[var(--color-text-secondary)]">{store.total_orders} orders</span>
                    <Badge variant="warning">{store.rating.toFixed(1)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
