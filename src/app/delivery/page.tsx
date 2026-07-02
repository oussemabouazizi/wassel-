'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Package, MapPin, Store, Star, DollarSign, Bike, ChevronRight,
  Clock, CheckCircle, XCircle, WifiOff, AlertTriangle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Button, Card, Badge, Tabs, Skeleton, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { notifyCustomerDeliveryAccepted, notifyCustomerOrderStatus } from '@/lib/notify';
import type { Order, DeliveryPerson } from '@/types';
import { useI18n } from '@/i18n';

export default function DeliveryDashboard() {
  const supabase = createClient();
  const { user } = useAppStore();
  const { toast } = useToast();
  const { t } = useI18n();

  const [deliveryPerson, setDeliveryPerson] = useState<DeliveryPerson | null>(null);
  const [availableOrders, setAvailableOrders] = useState<(Order & { stores: { name: string } })[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<(Order & { stores: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dpError, setDpError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('available');
  const initialLoadDone = useRef(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    if (!initialLoadDone.current) setLoading(true);
    setDpError(null);

    const { data: dp, error: dpErr } = await supabase
      .from('delivery_persons')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (dpErr) {
      setDpError(dpErr.message);
    } else if (dp) {
      setDeliveryPerson(dp as DeliveryPerson);
    } else {
      setDpError('No delivery profile found. Please register as a delivery person first.');
    }

    const { data: available } = await supabase
      .from('orders')
      .select('*, stores(name)')
      .eq('status', 'ready')
      .is('delivery_person_id', null);

    if (available) setAvailableOrders(available as (Order & { stores: { name: string } })[]);

    const { data: mine } = await supabase
      .from('orders')
      .select('*, stores(name)')
      .eq('delivery_person_id', user.id)
      .in('status', ['picked_up', 'on_the_way']);

    if (mine) setMyDeliveries(mine as (Order & { stores: { name: string } })[]);

    setLoading(false);
    initialLoadDone.current = true;
  }, [user, supabase]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleToggleOnline = async () => {
    if (!deliveryPerson) return;
    const newStatus = deliveryPerson.online_status === 'online' ? 'offline' : 'online';
    const { error } = await supabase
      .from('delivery_persons')
      .update({ online_status: newStatus })
      .eq('id', deliveryPerson.id);

    if (error) {
      toast('error', 'Failed to update status');
      return;
    }
    setDeliveryPerson({ ...deliveryPerson, online_status: newStatus });
    toast('success', `You are now ${newStatus}`);
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!user) return;
    setActionLoading(orderId);

    const order = availableOrders.find(o => o.id === orderId);
    if (!order) return;

    const { error } = await supabase
      .from('orders')
      .update({ delivery_person_id: user.id, status: 'picked_up' })
      .eq('id', orderId);

    if (error) {
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

    toast('success', 'Order accepted!');
    fetchData();
  };

  const tabs = [
    { id: 'available', label: t('delivery.availableOrders'), icon: <Package className="w-4 h-4" /> },
    { id: 'mine', label: t('delivery.activeDelivery'), icon: <Bike className="w-4 h-4" /> },
  ];

  const statusBadge = (status: string) => {
    const variants: Record<string, 'warning' | 'info' | 'success'> = {
      picked_up: 'warning',
      on_the_way: 'info',
    };
    return (
      <Badge variant={variants[status] || 'gray'} size="sm">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 rounded-xl" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (dpError && !deliveryPerson) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-12 h-12 text-[var(--color-error)]" />
        <p className="text-[var(--color-error)] font-medium text-center max-w-md">{dpError}</p>
        <p className="text-sm text-[var(--color-text-secondary)] text-center max-w-md">
          Make sure you have a delivery profile in the database. Run the RLS migration if needed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Bike className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--color-text-secondary)]">Online Status</p>
            <button
              onClick={handleToggleOnline}
              className={`mt-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                deliveryPerson?.online_status === 'online'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {deliveryPerson?.online_status === 'online' ? '● Online' : '○ Offline'}
            </button>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Deliveries</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{deliveryPerson?.total_deliveries || 0}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Rating</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{deliveryPerson?.rating?.toFixed(1) || '0.0'}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">Earnings</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatPrice(deliveryPerson?.total_earnings || 0)}</p>
          </div>
        </Card>
      </motion.div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'available' && (
        <div className="space-y-4">
          {availableOrders.length === 0 ? (
            <EmptyState
              icon={<Package className="w-8 h-8 text-[var(--color-text-secondary)]" />}
              title="No available orders"
              description="There are no orders ready for delivery right now. Check back soon."
            />
          ) : (
            availableOrders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card hover className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-text-primary)]">{order.order_number}</span>
                      <Badge variant="success" size="sm">Ready</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                      <Store className="w-4 h-4" />
                      <span>{order.stores?.name || 'Store'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                      <MapPin className="w-4 h-4" />
                      <span>{order.delivery_address}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-[var(--color-primary)] font-semibold">{formatPrice(order.delivery_fee)}</span>
                      <span className="text-[var(--color-text-secondary)]">{formatRelativeTime(order.created_at)}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAcceptOrder(order.id)}
                    isLoading={actionLoading === order.id}
                  >
                    {t('delivery.acceptOrder')}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === 'mine' && (
        <div className="space-y-4">
          {myDeliveries.length === 0 ? (
            <EmptyState
              icon={<Bike className="w-8 h-8 text-[var(--color-text-secondary)]" />}
              title="No active deliveries"
              description="You haven't accepted any deliveries yet. Check available orders."
            />
          ) : (
            myDeliveries.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card hover className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-text-primary)]">{order.order_number}</span>
                      {statusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                      <Store className="w-4 h-4" />
                      <span>{order.stores?.name || 'Store'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                      <MapPin className="w-4 h-4" />
                      <span>{order.delivery_address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-semibold">You earn: {formatPrice(order.delivery_fee)}</span>
                    </div>
                  </div>
                  {order.status === 'on_the_way' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        setActionLoading(order.id);
                        await supabase.from('orders').update({ status: 'delivered' }).eq('id', order.id);
                        if (deliveryPerson) {
                          await supabase.from('delivery_persons').update({
                            total_earnings: (deliveryPerson.total_earnings || 0) + order.delivery_fee,
                            total_deliveries: (deliveryPerson.total_deliveries || 0) + 1,
                          }).eq('id', deliveryPerson.id);
                        }
                        notifyCustomerOrderStatus(order.id, 'delivered', order.customer_id);
                        fetchData();
                        toast('success', 'Order delivered! Earnings updated.');
                        setActionLoading(null);
                      }}
                      isLoading={actionLoading === order.id}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {t('delivery.delivered')}
                    </Button>
                  )}
                  {order.status === 'picked_up' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        setActionLoading(order.id);
                        await supabase.from('orders').update({ status: 'on_the_way' }).eq('id', order.id);
                        fetchData();
                        toast('success', 'Order is on the way!');
                        setActionLoading(null);
                      }}
                      isLoading={actionLoading === order.id}
                    >
                      <Bike className="w-4 h-4" />
                      On The Way
                    </Button>
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
