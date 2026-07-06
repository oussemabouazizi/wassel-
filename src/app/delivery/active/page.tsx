'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bike, MapPin, Store, Package, ChevronRight, Navigation, Phone,
  Clock, CheckCircle, Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Button, Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import type { Order, OrderItem } from '@/types';

export default function ActiveDeliveriesPage() {
  const supabase = createClient();
  const { user } = useAppStore();
  const { toast } = useToast();

  const [orders, setOrders] = useState<(Order & { stores: { name: string; latitude: number; longitude: number }; order_items: OrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('orders')
      .select('*, stores(name, latitude, longitude), order_items(*)')
      .eq('delivery_person_id', user.id)
      .in('status', ['picked_up', 'on_the_way']);

    if (data) setOrders(data as typeof orders);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast('error', 'Failed to update order status');
    } else {
      toast('success', `Order ${newStatus === 'on_the_way' ? 'picked up' : 'delivered'}!`);
      fetchOrders();
    }
    setActionLoading(null);
  };

  const openInMaps = (lat: number, lng: number, label: string) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Active Deliveries</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Bike className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No active deliveries"
          description="You don't have any active deliveries. Check the available orders page."
          action={
            <Button onClick={() => window.location.href = '/delivery/available'}>
              View Available Orders
            </Button>
          }
        />
      ) : (
        orders.map((order, i) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg text-[var(--color-text-primary)]">{order.order_number}</span>
                    <Badge
                      variant={order.status === 'picked_up' ? 'warning' : 'info'}
                      size="sm"
                    >
                      {order.status === 'picked_up' ? 'Picked Up' : 'On the Way'}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{formatRelativeTime(order.updated_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3 p-3 rounded-xl bg-[var(--color-surface)]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                    <Store className="w-4 h-4 text-[var(--color-primary)]" />
                    Pickup - {order.stores?.name || 'Store'}
                  </div>
                  {order.stores?.latitude && order.stores?.longitude && (
                    <button
                      onClick={() => openInMaps(order.stores.latitude, order.stores.longitude, order.stores.name)}
                      className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline"
                    >
                      <Navigation className="w-4 h-4" />
                      Navigate to store
                    </button>
                  )}
                </div>

                  <div className="space-y-3 p-3 rounded-xl bg-[var(--color-surface)]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                    <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
                    Delivery - {order.delivery_address}
                  </div>
                  {order.delivery_latitude !== 0 && order.delivery_longitude !== 0 ? (
                    <button
                      onClick={() => openInMaps(order.delivery_latitude, order.delivery_longitude, order.delivery_address)}
                      className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline"
                    >
                      <Navigation className="w-4 h-4" />
                      Navigate to customer
                    </button>
                  ) : (
                    <p className="text-xs text-[var(--color-text-secondary)]">{order.delivery_address || 'No location shared'}</p>
                  )}
                </div>
              </div>

              {order.order_items && order.order_items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Items</p>
                  <div className="space-y-1">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-text-secondary)]">
                          {item.quantity}x Product
                        </span>
                        <span className="text-[var(--color-text-primary)] font-medium">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Delivery Fee</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">{formatPrice(order.delivery_fee)}</p>
                </div>
                <div className="flex gap-2">
                  {order.status === 'picked_up' && (
                    <Button
                      onClick={() => handleStatusUpdate(order.id, 'on_the_way')}
                      isLoading={actionLoading === order.id}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark as Picked Up
                    </Button>
                  )}
                  {order.status === 'on_the_way' && (
                    <Button
                      onClick={() => handleStatusUpdate(order.id, 'delivered')}
                      isLoading={actionLoading === order.id}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark as Delivered
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
}
