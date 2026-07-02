'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Package, ShoppingBag, DollarSign, Plus, List, Power } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Card, Button, Badge, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
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
    { label: t('vendor.totalStores'), value: stats.totalStores, icon: Store, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t('vendor.totalProducts'), value: stats.totalProducts, icon: Package, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: t('vendor.totalOrders'), value: stats.totalOrders, icon: ShoppingBag, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: t('vendor.totalEarnings'), value: formatPrice(stats.totalEarnings), icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('vendor.title')}</h1>
          <p className="text-[var(--color-text-secondary)]">{t('vendor.welcomeBack', { name: user?.full_name || '' })}</p>
        </div>
        <Link href="/vendor/products">
          <Button variant="primary">
            <Plus className="w-4 h-4" />
            {t('vendor.addProduct')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('vendor.ordersOverview')}</h2>
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
                  <Bar dataKey="orders" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('vendor.recentOrders')}</h2>
              <Link href="/vendor/orders">
                <Button variant="ghost" size="sm">
                  {t('common.viewAll')}
                </Button>
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">{t('vendor.noOrders')}</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {t('vendor.orderNumber', { id: order.id.substring(0, 8) })}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {order.profiles?.full_name} • {formatRelativeTime(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{formatPrice(order.total)}</span>
                      <Badge variant={statusBadge[order.status] || 'gray'}>{order.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('vendor.quickActions')}</h2>
            <div className="space-y-3">
              <Link href="/vendor/products">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Plus className="w-4 h-4" />
            {t('vendor.addProduct')}
                </Button>
              </Link>
              <Link href="/vendor/orders">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <List className="w-4 h-4" />
                   {t('vendor.viewOrders')}
                </Button>
              </Link>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('vendor.yourStores')}</h2>
            {stores.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] py-4 text-center">{t('vendor.noStores')}</p>
            ) : (
              <div className="space-y-3">
                {stores.map((store) => (
                  <div key={store.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {store.image_url ? (
                          <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-5 h-5 m-2.5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{store.name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{store.total_orders} {t('vendor.ordersCount')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleStoreOpen(store)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        store.is_open
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      <Power className="w-3 h-3 inline mr-1" />
                      {store.is_open ? t('store.open') : t('store.closed')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
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
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16 mt-2" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-64 w-full" />
          </Card>
        </div>
        <div>
          <Card>
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}
