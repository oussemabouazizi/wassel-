'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, MapPin, Store, Star, DollarSign, Bike, ChevronRight,
  Clock, CheckCircle, WifiOff, AlertTriangle, Navigation
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Button, Badge, Tabs, Skeleton, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui';
import { formatPrice, formatRelativeTime, cn } from '@/lib/utils';
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
      setDpError(t('delivery.noProfileError'));
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
      toast('error', t('delivery.statusUpdateFailed'));
      return;
    }
    setDeliveryPerson({ ...deliveryPerson, online_status: newStatus });
    toast('success', t('delivery.statusChanged', { status: newStatus }));
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
      toast('error', t('delivery.acceptFailed'));
      setActionLoading(null);
      return;
    }

    const { error: chatErr } = await supabase.from('chats').insert({
      order_id: orderId,
      customer_id: order.customer_id,
      delivery_person_id: user.id,
    });

    if (chatErr) toast('error', t('delivery.chatCreationFailed'));

    notifyCustomerDeliveryAccepted(orderId, user.full_name || user.email, order.customer_id);

    toast('success', t('delivery.orderAccepted'));
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center"
        >
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </motion.div>
        <p className="text-red-500 font-bold text-center max-w-md">{dpError}</p>
        <p className="text-sm text-[var(--color-text-secondary)] text-center max-w-md">
          {t('delivery.profileSetupHint')}
        </p>
      </div>
    );
  }

  const statCards = [
    {
      label: t('delivery.onlineStatus'),
      value: deliveryPerson?.online_status === 'online' ? t('delivery.online') : t('delivery.offline'),
      icon: Bike,
      gradient: deliveryPerson?.online_status === 'online' ? 'from-emerald-500 to-green-600' : 'from-gray-400 to-gray-500',
      action: (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggleOnline}
          className={cn(
            'mt-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
            deliveryPerson?.online_status === 'online'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          )}
        >
          {deliveryPerson?.online_status === 'online' ? `● ${t('delivery.online')}` : `○ ${t('delivery.offline')}`}
        </motion.button>
      ),
    },
    {
      label: t('delivery.totalDeliveries'),
      value: deliveryPerson?.total_deliveries || 0,
      icon: Package,
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      label: t('home.reviews'),
      value: deliveryPerson?.rating?.toFixed(1) || '0.0',
      icon: Star,
      gradient: 'from-yellow-500 to-amber-600',
    },
    {
      label: t('delivery.earnings'),
      value: formatPrice(deliveryPerson?.total_earnings || 0),
      icon: DollarSign,
      gradient: 'from-[#FF6B00] to-red-500',
    },
  ];

  return (
    <div className="relative">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-emerald-300/6 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-gradient-to-tr from-[#FF6B00]/6 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="space-y-6">
        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-4 hover:shadow-lg hover:shadow-black/5 transition-all duration-300 group">
                <div className="flex items-start justify-between mb-2">
                  <div className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300',
                    stat.gradient
                  )}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xl font-extrabold text-[var(--color-text-primary)] mt-2">{stat.value}</p>
                <p className="text-[11px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mt-0.5">{stat.label}</p>
                {stat.action}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </motion.div>

        {/* Available Orders */}
        {activeTab === 'available' && (
          <div className="space-y-3">
            {availableOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <EmptyState
                  icon={<Package className="w-8 h-8 text-[var(--color-text-secondary)]" />}
                  title={t('delivery.noAvailableOrders')}
                  description={t('delivery.noAvailableDesc')}
                />
              </motion.div>
            ) : (
              availableOrders.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5 hover:shadow-lg hover:shadow-black/5 hover:border-emerald-300/30 transition-all duration-300 group">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[var(--color-text-primary)]">{order.order_number}</span>
                          <Badge variant="success" size="sm">{t('orders.status.ready')}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                          <Store className="w-4 h-4 text-[#FF6B00]" />
                          <span className="font-medium">{order.stores?.name || t('orders.store')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span>{order.delivery_address}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{formatPrice(order.delivery_fee)}</span>
                          <span className="text-[var(--color-text-secondary)] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(order.created_at)}
                          </span>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleAcceptOrder(order.id)}
                        disabled={actionLoading === order.id}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-all disabled:opacity-50"
                      >
                        {actionLoading === order.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Navigation className="w-4 h-4" />
                        )}
                        {t('delivery.acceptOrder')}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* My Deliveries */}
        {activeTab === 'mine' && (
          <div className="space-y-3">
            {myDeliveries.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <EmptyState
                  icon={<Bike className="w-8 h-8 text-[var(--color-text-secondary)]" />}
                  title={t('delivery.noActiveDeliveries')}
                  description={t('delivery.noActiveDesc')}
                />
              </motion.div>
            ) : (
              myDeliveries.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5 hover:shadow-lg hover:shadow-black/5 transition-all duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[var(--color-text-primary)]">{order.order_number}</span>
                          {statusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                          <Store className="w-4 h-4 text-[#FF6B00]" />
                          <span className="font-medium">{order.stores?.name || t('orders.store')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span>{order.delivery_address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{t('delivery.youEarn', { amount: formatPrice(order.delivery_fee) })}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {order.status === 'on_the_way' && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
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
                              toast('success', t('delivery.deliveredToast'));
                              setActionLoading(null);
                            }}
                            disabled={actionLoading === order.id}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-all"
                          >
                            {actionLoading === order.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            {t('delivery.delivered')}
                          </motion.button>
                        )}
                        {order.status === 'picked_up' && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={async () => {
                              setActionLoading(order.id);
                              await supabase.from('orders').update({ status: 'on_the_way' }).eq('id', order.id);
                              fetchData();
                              toast('success', t('delivery.onTheWayToast'));
                              setActionLoading(null);
                            }}
                            disabled={actionLoading === order.id}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-red-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:shadow-xl transition-all"
                          >
                            {actionLoading === order.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Navigation className="w-4 h-4" />
                            )}
                            {t('delivery.onTheWay')}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
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
