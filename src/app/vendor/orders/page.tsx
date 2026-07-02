'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Search, Filter, Clock, MapPin, User, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Card, Button, Badge, Select, Tabs, Skeleton, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { notifyCustomerOrderStatus } from '@/lib/notify';
import type { Store as StoreType, Order, OrderItem, Profile } from '@/types';

type OrderWithDetails = Order & { stores: StoreType; profiles: Profile; order_items: (OrderItem & { product_name?: string })[] };

const STATUS_FLOW: Record<string, { next: string; label: string; variant: 'primary' | 'outline' | 'danger' }> = {
  pending: { next: 'confirmed', label: 'Confirm', variant: 'primary' },
  confirmed: { next: 'preparing', label: 'Start Preparing', variant: 'primary' },
  preparing: { next: 'ready', label: 'Mark Ready', variant: 'primary' },
  ready: { next: '', label: '', variant: 'primary' },
  picked_up: { next: '', label: '', variant: 'primary' },
  on_the_way: { next: '', label: '', variant: 'primary' },
  delivered: { next: '', label: '', variant: 'primary' },
  cancelled: { next: '', label: '', variant: 'danger' },
};

const ORDER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'info',
  ready: 'success',
  picked_up: 'info',
  on_the_way: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

export default function OrderManagement() {
  const supabase = createClient();
  const { user } = useAppStore();
  const { toast } = useToast();

  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadStores();
  }, [user]);

  async function loadStores() {
    try {
      const { data } = await supabase.from('stores').select('*').eq('owner_id', user!.id);
      const storeList = data || [];
      setStores(storeList);
      if (storeList.length > 0) {
        setSelectedStoreId(storeList[0].id);
      }
    } catch {
      toast('error', 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedStoreId) loadOrders();
  }, [selectedStoreId]);

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*, stores!orders_store_id_fkey(*), order_items(*)')
      .eq('store_id', selectedStoreId)
      .order('created_at', { ascending: false });

    if (error) {
      toast('error', 'Failed to load orders: ' + error.message);
      return;
    }

    const ordersWithProfiles = await Promise.all(
      (data || []).map(async (order) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', order.customer_id)
          .single();
        return { ...order, profiles: profile };
      })
    );

    setOrders(ordersWithProfiles);
  }

  async function updateStatus(order: Order, newStatus: string) {
    setUpdating(order.id);
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    if (error) {
      toast('error', 'Failed to update order status');
    } else {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus as Order['status'] } : o));
      toast('success', `Order #${order.id.substring(0, 8)} ${newStatus}`);
      notifyCustomerOrderStatus(order.id, newStatus, order.customer_id);
    }
    setUpdating(null);
  }

  async function cancelOrder(order: Order) {
    setUpdating(order.id);
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
    if (error) {
      toast('error', 'Failed to cancel order');
    } else {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
      toast('success', `Order #${order.id.substring(0, 8)} cancelled`);
      notifyCustomerOrderStatus(order.id, 'cancelled', order.customer_id);
    }
    setUpdating(null);
  }

  const filtered = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);

  if (loading) return <OrderSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Orders</h1>
          <p className="text-[var(--color-text-secondary)]">Manage incoming orders</p>
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
          <EmptyState
            icon={<ShoppingBag className="w-8 h-8" />}
            title="No store selected"
            description="Create a store first to manage orders"
          />
        </Card>
      ) : (
        <>
          <Tabs tabs={ORDER_TABS} activeTab={activeTab} onChange={setActiveTab} />

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ShoppingBag className="w-8 h-8" />}
                title="No orders found"
                description={activeTab === 'all' ? 'No orders yet for this store' : `No ${activeTab} orders`}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card hover className="cursor-pointer" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[var(--color-text-primary)]">
                              Order #{order.id.substring(0, 8)}
                            </p>
                            <Badge variant={STATUS_BADGE[order.status] || 'gray'}>
                              {order.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {order.profiles?.full_name} • {formatRelativeTime(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-[var(--color-text-primary)]">{formatPrice(order.total)}</span>
                        {expandedId === order.id ? (
                          <ChevronUp className="w-5 h-5 text-[var(--color-text-secondary)]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[var(--color-text-secondary)]" />
                        )}
                      </div>
                    </div>

                    {expandedId === order.id && (
                      <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                              <User className="w-4 h-4" />
                              <span className="text-[var(--color-text-primary)] font-medium">{order.profiles?.full_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                              <MapPin className="w-4 h-4" />
                              <span>{order.delivery_address}</span>
                            </div>
                            {order.notes && (
                              <p className="text-sm text-[var(--color-text-secondary)] italic">Note: {order.notes}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Items</p>
                            {order.order_items?.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-[var(--color-text-secondary)]">
                                  {item.quantity}x {item.product_name || `Product #${item.product_id.slice(-6)}`}
                                </span>
                                <span className="text-[var(--color-text-primary)] font-medium">{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm pt-2 border-t border-[var(--color-border)]">
                              <span className="font-medium text-[var(--color-text-primary)]">Total</span>
                              <span className="font-bold text-[var(--color-text-primary)]">{formatPrice(order.total)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          {STATUS_FLOW[order.status]?.next && (
                            <Button
                              variant={STATUS_FLOW[order.status].variant}
                              size="sm"
                              isLoading={updating === order.id}
                              onClick={(e) => { e.stopPropagation(); updateStatus(order, STATUS_FLOW[order.status].next); }}
                            >
                              {STATUS_FLOW[order.status].label}
                            </Button>
                          )}
                          {!['delivered', 'cancelled', 'ready'].includes(order.status) && (
                            <Button
                              variant="danger"
                              size="sm"
                              isLoading={updating === order.id}
                              onClick={(e) => { e.stopPropagation(); cancelOrder(order); }}
                            >
                              Cancel Order
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>
      <Skeleton className="h-12 w-full" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-5 w-48 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}
