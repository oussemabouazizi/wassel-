'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Package, MapPin, Store, DollarSign, Clock, ShoppingBag,
  ChevronRight, Hash, FileText
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Button, Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { notifyCustomerDeliveryAccepted } from '@/lib/notify';
import type { Order, OrderItem } from '@/types';

export default function AvailableOrdersPage() {
  const supabase = createClient();
  const { user } = useAppStore();
  const { toast } = useToast();

  const [orders, setOrders] = useState<(Order & { stores: { name: string }; order_items: OrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('orders')
      .select('*, stores(name), order_items(*)')
      .eq('status', 'ready')
      .is('delivery_person_id', null);

    if (data) setOrders(data as typeof orders);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleAccept = async (orderId: string) => {
    if (!user) return;
    setActionLoading(orderId);

    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const { error: orderErr } = await supabase
      .from('orders')
      .update({ delivery_person_id: user.id, status: 'picked_up' })
      .eq('id', orderId);

    if (orderErr) {
      toast('error', 'Failed to accept order');
      setActionLoading(null);
      return;
    }

    const { error: chatErr } = await supabase.from('chats').insert({
      order_id: orderId,
      customer_id: order.customer_id,
      delivery_person_id: user.id,
    });

    if (chatErr) toast('error', 'Order accepted but chat creation failed');

    notifyCustomerDeliveryAccepted(orderId, user.full_name || user.email, order.customer_id);

    toast('success', 'Order accepted successfully!');
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Available Orders</h1>
        <Badge variant="primary" size="md">{orders.length} available</Badge>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No orders available"
          description="All orders have been assigned to delivery persons. Check back for new orders."
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--color-text-primary)]">{order.order_number}</span>
                        <Badge variant="success" size="sm">Ready</Badge>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)]">{formatRelativeTime(order.created_at)}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(order.id)}
                    isLoading={actionLoading === order.id}
                  >
                    Accept
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 text-sm">
                    <Store className="w-4 h-4 text-[var(--color-text-secondary)] mt-0.5" />
                    <div>
                      <p className="text-[var(--color-text-secondary)] text-xs">Store</p>
                      <p className="text-[var(--color-text-primary)] font-medium">{order.stores?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-[var(--color-text-secondary)] mt-0.5" />
                    <div>
                      <p className="text-[var(--color-text-secondary)] text-xs">Delivery Address</p>
                      <p className="text-[var(--color-text-primary)] font-medium">{order.delivery_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Hash className="w-4 h-4 text-[var(--color-text-secondary)] mt-0.5" />
                    <div>
                      <p className="text-[var(--color-text-secondary)] text-xs">Items</p>
                      <p className="text-[var(--color-text-primary)] font-medium">{order.order_items?.length || 0} items</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-[var(--color-text-secondary)] mt-0.5" />
                    <div>
                      <p className="text-[var(--color-text-secondary)] text-xs">Delivery Fee</p>
                      <p className="text-[var(--color-primary)] font-bold">{formatPrice(order.delivery_fee)}</p>
                    </div>
                  </div>
                </div>

                {order.notes && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--color-surface)] text-sm">
                    <FileText className="w-4 h-4 text-[var(--color-text-secondary)] mt-0.5" />
                    <p className="text-[var(--color-text-secondary)]">{order.notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <DollarSign className="w-3 h-3" />
                  Total: {formatPrice(order.total)}
                  <span className="mx-1">|</span>
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(order.created_at)}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
