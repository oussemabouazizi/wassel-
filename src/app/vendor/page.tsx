'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {   Store, Package, ShoppingBag, DollarSign, Plus, List, Power, TrendingUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Badge, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui';
import { formatPrice, formatRelativeTime, cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Store as StoreType, Order, OrderItem, Profile } from '@/types';
import { useI18n } from '@/i18n';

interface DashboardStats {
  totalStores: number;
  totalProducts: number;
  totalOrders: number;
  totalEarnings: number;
}

export default function VendorDashboard() {
  const supabase = createClient();
  const { user } = useAppStore();
  const { toast } = useToast();
  const { t } = useI18n();

  const [stores, setStores] = useState<StoreType[]>([]);
  const [recentOrders, setRecentOrders] = useState<(Order & { stores: StoreType; profiles: Profile; order_items: OrderItem[] })[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalStores: 0, totalProducts: 0, totalOrders: 0, totalEarnings: 0 });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{ day: string; orders: number }[]>([]);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  async function loadDashboard() {
    try {
      const { data: storesData } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user!.id);

      const vendorStores = storesData || [];
      setStores(vendorStores);
      const storeIds = vendorStores.map(s => s.id);

      let totalProducts = 0;
      let totalOrders = 0;
      let totalEarnings = 0;

      if (storeIds.length > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id')
          .in('store_id', storeIds);
        totalProducts = productsData?.length || 0;

        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .in('store_id', storeIds)
          .order('created_at', { ascending: false });
        totalOrders = ordersData?.length || 0;
        totalEarnings = ordersData?.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0) || 0;

        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });

        const orderCounts: Record<string, number> = {};
        (ordersData || []).forEach(o => {
          const day = o.created_at.split('T')[0];
          if (last7.includes(day)) {
            orderCounts[day] = (orderCounts[day] || 0) + 1;
          }
        });

        setChartData(last7.map(day => ({
          day: new Date(day + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }),
          orders: orderCounts[day] || 0,
        })));

        const { data: recent } = await supabase
          .from('orders')
          .select('*, stores(*), profiles!orders_customer_id_fkey(*), order_items(*)')
          .in('store_id', storeIds)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentOrders(recent || []);
      }

      setStats({ totalStores: vendorStores.length, totalProducts, totalOrders, totalEarnings });
    } catch {
      toast('error', t('vendor.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function toggleStoreOpen(store: StoreType) {
    const { error } = await supabase
      .from('stores')
      .update({ is_open: !store.is_open })
      .eq('id', store.id);
    if (error) {
      toast('error', t('vendor.storeStatusFailed'));
    } else {
      setStores(prev => prev.map(s => s.id === store.id ? { ...s, is_open: !s.is_open } : s));
      toast('success', t('vendor.storeStatusChanged', { name: store.name, status: !store.is_open ? t('store.open') : t('store.closed') }));
    }
  }

  const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    confirmed: 'info',
    preparing: 'info',
    ready: 'success',
    picked_up: 'info',
    on_the_way: 'info',
    delivered: 'success',
    cancelled: 'danger',
  };

  if (loading) return <DashboardSkeleton />;

  const statCards = [
    { label: t('vendor.totalStores'), value: stats.totalStores, icon: Store, gradient: 'from-blue-500 to-indigo-600' },
    { label: t('vendor.totalProducts'), value: stats.totalProducts, icon: Package, gradient: 'from-purple-500 to-pink-600' },
    { label: t('vendor.totalOrders'), value: stats.totalOrders, icon: ShoppingBag, gradient: 'from-[#FF6B00] to-red-500' },
    { label: t('vendor.totalEarnings'), value: formatPrice(stats.totalEarnings), icon: DollarSign, gradient: 'from-emerald-500 to-green-600' },
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
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('vendor.title')}</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">{t('vendor.welcomeBack', { name: user?.full_name || '' })}</p>
          </div>
          <Link href="/vendor/products">
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E55A00] text-white text-sm font-bold shadow-lg shadow-orange-500/20 hover:shadow-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('vendor.addProduct')}
            </motion.button>
          </Link>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-4 hover:shadow-lg hover:shadow-black/5 hover:border-[#FF6B00]/20 transition-all duration-300 group">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300',
                    stat.gradient
                  )}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-[var(--color-text-primary)]">{stat.value}</p>
                <p className="text-[11px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart + Recent Orders */}
          <div className="lg:col-span-2 space-y-4">
            {/* Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5"
            >
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#FF6B00]" />
                {t('vendor.ordersOverview')}
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="day" stroke="var(--color-text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-background)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    <Bar dataKey="orders" fill="url(#orangeGradient)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF6B00" />
                        <stop offset="100%" stopColor="#E55A00" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Recent Orders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#FF6B00]" />
                  {t('vendor.recentOrders')}
                </h2>
                <Link href="/vendor/orders" className="text-xs font-bold text-[#FF6B00] hover:underline flex items-center gap-1">
                  {t('common.viewAll')} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">{t('vendor.noOrders')}</p>
              ) : (
                <div className="space-y-2.5">
                  {recentOrders.map((order, i) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-border)]/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-[#FF6B00] group-hover:scale-110 transition-transform">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">
                            {t('vendor.orderNumber', { id: order.id.substring(0, 8) })}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {order.profiles?.full_name} • {formatRelativeTime(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-[var(--color-primary)]">{formatPrice(order.total)}</span>
                        <Badge variant={statusBadge[order.status] || 'gray'}>{order.status}</Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5"
            >
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#FF6B00]" />
                {t('vendor.quickActions')}
              </h2>
              <div className="space-y-2.5">
                {[
                  { href: '/vendor/products', icon: Plus, label: t('vendor.addProduct'), gradient: 'from-blue-500 to-indigo-600' },
                  { href: '/vendor/orders', icon: List, label: t('vendor.viewOrders'), gradient: 'from-[#FF6B00] to-red-500' },
                ].map((action) => (
                  <Link key={action.href} href={action.href}>
                    <motion.div
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-border)]/30 transition-all group"
                    >
                      <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform', action.gradient)}>
                        <action.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">{action.label}</span>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] ml-auto group-hover:text-[#FF6B00] group-hover:translate-x-1 transition-all" />
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Stores */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5"
            >
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <Store className="w-5 h-5 text-[#FF6B00]" />
                {t('vendor.yourStores')}
              </h2>
              {stores.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)] py-4 text-center">{t('vendor.noStores')}</p>
              ) : (
                <div className="space-y-2.5">
                  {stores.map((store, i) => (
                    <motion.div
                      key={store.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-border)]/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                          {store.image_url ? (
                            <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Store className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">{store.name}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{store.total_orders} {t('vendor.ordersCount')}</p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleStoreOpen(store)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                          store.is_open
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        )}
                      >
                        <Power className="w-3 h-3" />
                        {store.is_open ? t('store.open') : t('store.closed')}
                      </motion.button>
                    </motion.div>
                  ))}
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
