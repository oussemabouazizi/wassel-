'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, ShoppingBag, DollarSign, TrendingUp, Package, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Card, Select, Skeleton, Badge } from '@/components/ui';
import { useToast } from '@/components/ui';
import { formatPrice, formatDate } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Store as StoreType, Order, OrderItem, Product } from '@/types';

const PIE_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#eab308'];

interface ProductSales extends Product {
  total_sold: number;
  total_revenue: number;
}

export default function Analytics() {
  const supabase = createClient();
  const { user } = useAppStore();
  const { toast } = useToast();

  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);
  const [orderStatusDist, setOrderStatusDist] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [dailyOrders, setDailyOrders] = useState<{ day: string; orders: number; revenue: number }[]>([]);

  useEffect(() => {
    if (user) loadStores();
  }, [user]);

  async function loadStores() {
    try {
      const { data } = await supabase.from('stores').select('*').eq('owner_id', user!.id);
      const list = data || [];
      setStores(list);
      if (list.length > 0) {
        setSelectedStoreId(list[0].id);
      }
    } catch {
      toast('error', 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedStoreId) loadAnalytics();
  }, [selectedStoreId]);

  async function loadAnalytics() {
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', selectedStoreId)
        .order('created_at', { ascending: false });

      const orders = ordersData || [];
      setTotalOrders(orders.length);
      setRecentOrders(orders.slice(0, 10));

      const delivered = orders.filter(o => o.status === 'delivered');
      const rev = delivered.reduce((s, o) => s + o.total, 0);
      setTotalRevenue(rev);
      setAvgOrderValue(delivered.length > 0 ? rev / delivered.length : 0);

      const statusCounts: Record<string, number> = {};
      orders.forEach(o => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      });
      setOrderStatusDist(
        Object.entries(statusCounts).map(([name, value], i) => ({
          name: name.replace(/_/g, ' '),
          value,
          color: PIE_COLORS[i % PIE_COLORS.length],
        }))
      );

      const last14 = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return d.toISOString().split('T')[0];
      });

      const dailyMap: Record<string, { orders: number; revenue: number }> = {};
      last14.forEach(d => { dailyMap[d] = { orders: 0, revenue: 0 }; });
      orders.forEach(o => {
        const day = o.created_at.split('T')[0];
        if (dailyMap[day]) {
          dailyMap[day].orders += 1;
          if (o.status === 'delivered') dailyMap[day].revenue += o.total;
        }
      });
      setDailyOrders(
        last14.map(d => ({
          day: new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          orders: dailyMap[d].orders,
          revenue: dailyMap[d].revenue,
        }))
      );

      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*, product_id')
        .in('order_id', orders.map(o => o.id));

      const productCount: Record<string, { qty: number; rev: number }> = {};
      (itemsData || []).forEach(item => {
        if (!productCount[item.product_id]) {
          productCount[item.product_id] = { qty: 0, rev: 0 };
        }
        productCount[item.product_id].qty += item.quantity;
        productCount[item.product_id].rev += item.price * item.quantity;
      });

      const topProdIds = Object.entries(productCount)
        .sort(([, a], [, b]) => b.qty - a.qty)
        .slice(0, 5)
        .map(([id]) => id);

      if (topProdIds.length > 0) {
        const { data: prodData } = await supabase
          .from('products')
          .select('*')
          .in('id', topProdIds);

        const prods = (prodData || []).map(p => ({
          ...p,
          total_sold: productCount[p.id]?.qty || 0,
          total_revenue: productCount[p.id]?.rev || 0,
        })).sort((a, b) => b.total_sold - a.total_sold);

        setTopProducts(prods);
      } else {
        setTopProducts([]);
      }
    } catch {
      toast('error', 'Failed to load analytics');
    }
  }

  if (loading) return <AnalyticsSkeleton />;

  const statCards = [
    { label: 'Total Orders', value: totalOrders, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Revenue', value: formatPrice(totalRevenue), icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Avg Order Value', value: formatPrice(avgOrderValue), icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Top Products', value: topProducts.length, icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Analytics</h1>
          <p className="text-[var(--color-text-secondary)]">Track your store performance</p>
        </div>
        {stores.length > 1 && (
          <Select
            value={selectedStoreId}
            onChange={e => setSelectedStoreId(e.target.value)}
            options={stores.map(s => ({ value: s.id, label: s.name }))}
            className="w-48"
          />
        )}
      </div>

      {!selectedStoreId ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="w-12 h-12 text-[var(--color-text-secondary)] mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">No store selected</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">Create a store first to view analytics</p>
          </div>
        </Card>
      ) : (
        <>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Daily Orders (14 days)</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyOrders}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="day" stroke="var(--color-text-secondary)" fontSize={11} angle={-20} textAnchor="end" height={50} />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-background)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    <Bar dataKey="orders" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Order Status Distribution</h2>
              <div className="h-72 flex items-center">
                <div className="flex-1 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderStatusDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={(({ name, percent }: Record<string, unknown>) => `${name} ${(Number(percent) * 100).toFixed(0)}%`) as any}
                        labelLine={false}
                      >
                        {orderStatusDist.map((entry, i) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '12px',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Top Products</h2>
              {topProducts.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No product sales data yet</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, i) => (
                    <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-sm font-bold text-orange-500">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">{product.name}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{product.total_sold} sold</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{formatPrice(product.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Recent Orders</h2>
              </div>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No orders yet</p>
              ) : (
                <div className="space-y-2">
                  {recentOrders.slice(0, 8).map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          #{order.id.substring(0, 8)}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{formatPrice(order.total)}</span>
                        <Badge variant={
                          order.status === 'delivered' ? 'success' :
                          order.status === 'cancelled' ? 'danger' :
                          order.status === 'pending' ? 'warning' : 'info'
                        } size="sm">
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-20" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-72 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-72 w-full" />
        </Card>
      </div>
    </div>
  );
}
