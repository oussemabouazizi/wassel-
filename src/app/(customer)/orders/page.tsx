'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, Store, ChevronRight, Package, Star, Repeat } from 'lucide-react';
import { Card, Badge, Skeleton, EmptyState, Button, Textarea, Modal } from '@/components/ui';
import { useToast } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { useI18n } from '@/i18n';
import type { Order, Store as StoreType } from '@/types';

type OrderWithStore = Order & { stores: Pick<StoreType, 'name' | 'image_url' | 'id'> };

const statusVariants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'gray'> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'info',
  ready: 'primary',
  picked_up: 'primary',
  on_the_way: 'primary',
  delivered: 'success',
  cancelled: 'danger',
};

export default function OrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();

  const statusLabels: Record<string, string> = {
    pending: t('orders.status.pending'),
    confirmed: t('orders.status.confirmed'),
    preparing: t('orders.status.preparing'),
    ready: t('orders.status.ready'),
    picked_up: t('orders.status.picked_up'),
    on_the_way: t('orders.status.on_the_way'),
    delivered: t('orders.status.delivered'),
    cancelled: t('orders.status.cancelled'),
  };

  const user = useAppStore((s) => s.user);
  const [orders, setOrders] = useState<OrderWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewStoreId, setReviewStoreId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchOrders = async () => {
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, stores(name, image_url, id)')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);

        const orderIds = (data || []).map(o => o.id);
        if (orderIds.length > 0) {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('order_id')
            .in('order_id', orderIds)
            .eq('user_id', user.id);
          if (reviews) setReviewedOrderIds(new Set(reviews.map(r => r.order_id)));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, router]);

  async function handleSubmitReview() {
    if (!reviewOrderId || !reviewStoreId || reviewRating === 0 || !user) return;
    setReviewSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        store_id: reviewStoreId,
        order_id: reviewOrderId,
        rating: reviewRating,
        comment: reviewComment || null,
      });
      if (error) throw error;
      setReviewedOrderIds(prev => new Set(prev).add(reviewOrderId));
      setReviewOrderId(null);
      setReviewRating(0);
      setReviewComment('');
      toast('success', t('orders.reviewSubmitted'));
    } catch (err: any) {
      toast('error', err.message || t('orders.reviewFailed'));
    } finally {
      setReviewSubmitting(false);
    }
  }

  const handleReorder = async (orderId: string) => {
    if (!user) return;
    const supabase = createClient();
    try {
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('*, products(*)')
        .eq('order_id', orderId);
      if (error) throw error;
      if (!orderItems || orderItems.length === 0) {
        toast('error', t('orders.orderNotFound'));
        return;
      }
      const addToCart = useAppStore.getState().addToCart;
      for (const item of orderItems) {
        if (item.products) {
          addToCart(item.products as any, item.quantity);
        }
      }
      toast('success', t('orders.reorder'));
      router.push('/checkout');
    } catch {
      toast('error', t('common.somethingWentWrong'));
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<Package className="w-8 h-8 text-[var(--color-error)]" />}
          title={t('common.somethingWentWrong')}
          description={error}
        />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4"
      >
        <EmptyState
          icon={<Clock className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title={t('orders.title')}
          description={t('orders.noOrders')}
          action={
            <Link href="/stores">
              <span className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold inline-block">
                {t('common.viewAll')}
              </span>
            </Link>
          }
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 max-w-2xl mx-auto"
    >
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{t('orders.title')}</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">{orders.length} {t('orders.past')}</p>

      <div className="space-y-3">
        {orders.map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="flex items-center gap-4">
              <Link href={`/orders/${order.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-[var(--color-surface)] overflow-hidden shrink-0">
                  {order.stores?.image_url ? (
                    <img
                      src={order.stores.image_url}
                      alt={order.stores.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="w-6 h-6 text-[var(--color-text-secondary)]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-text-primary)] text-sm truncate">
                        {order.stores?.name || t('orders.store')}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                        {(order as any).order_number || `#${order.id.slice(0, 8)}`}
                      </p>
                    </div>
                    <Badge variant={statusVariants[order.status] || 'gray'} size="sm">
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {formatDate(order.created_at)}
                    </span>
                    <span className="text-sm font-bold text-[var(--color-primary)]">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
              </Link>

              {order.status === 'delivered' && order.stores?.id && !reviewedOrderIds.has(order.id) && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setReviewOrderId(order.id);
                    setReviewStoreId(order.stores!.id);
                    setReviewRating(0);
                    setReviewComment('');
                  }}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors flex items-center gap-1"
                >
                  <Star className="w-3 h-3" /> {t('orders.rateOrder')}
                </button>
              )}
              {order.status === 'delivered' && reviewedOrderIds.has(order.id) && (
                <span className="shrink-0 px-3 py-1.5 text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg flex items-center gap-1">
                  <Star className="w-3 h-3 fill-green-500 text-green-500" /> {t('orders.reviewed')}
                </span>
              )}
              {order.status === 'delivered' && order.stores?.id && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleReorder(order.id);
                  }}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors flex items-center gap-1"
                >
                  <Repeat className="w-3 h-3" /> {t('orders.reorder')}
                </button>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewOrderId}
        onClose={() => setReviewOrderId(null)}
        title={t('orders.rateExperience')}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-1 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setReviewRating(star)} className="p-0.5 transition-transform hover:scale-110">
                <Star
                  className={cn(
                    'w-10 h-10 transition-colors',
                    star <= reviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder={t('orders.reviewPlaceholder')}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={3}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setReviewOrderId(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmitReview} isLoading={reviewSubmitting} disabled={reviewRating === 0}>
              {t('common.submit')}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
