'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Navigation } from 'lucide-react';
import { Button, Skeleton, EmptyState } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { useI18n } from '@/i18n';
import TrackingPanel from '@/components/tracking/tracking-panel';
import type { Order, Profile, DeliveryPerson, Store } from '@/types';

type OrderWithRelations = Order & {
  stores: Store;
  delivery_person: (DeliveryPerson & { profiles: Profile }) | null;
};

export default function TrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const user = useAppStore((s) => s.user);
  const [order, setOrder] = useState<OrderWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchOrder = async () => {
      const supabase = createClient();
      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*, stores(*), delivery_person:delivery_persons(*, profiles(*))')
          .eq('id', params.orderId)
          .single();

        if (fetchError) throw fetchError;

        if (data.status === 'delivered' || data.status === 'cancelled') {
          router.replace(`/orders/${params.orderId}`);
          return;
        }

        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('orders.orderNotFound'));
      } finally {
        setLoading(false);
      }
    };

    if (params.orderId) fetchOrder();
  }, [params.orderId, user, router]);

  useEffect(() => {
    if (!order) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`order-status-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          const updated = payload.new as Order;
          setOrder((prev) => (prev ? { ...prev, ...updated } : null));

          if (updated.status === 'delivered' || updated.status === 'cancelled') {
            router.replace(`/orders/${order.id}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, router]);

  if (loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<Navigation className="w-8 h-8 text-[var(--color-error)]" />}
          title={t('tracking.cannotTrack')}
          description={error || t('tracking.orderRemoved')}
          action={
            <Button variant="outline" onClick={() => router.push('/orders')}>
              {t('common.viewAll')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 max-w-2xl mx-auto pb-32"
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {t('tracking.trackOrder')}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {order.order_number || `#${order.id.slice(0, 8)}`}
          </p>
        </div>
      </div>

      <TrackingPanel
        order={order}
        deliveryPerson={order.delivery_person!}
        storeLocation={{
          lat: order.stores?.latitude ?? 0,
          lng: order.stores?.longitude ?? 0,
        }}
      />
    </motion.div>
  );
}
