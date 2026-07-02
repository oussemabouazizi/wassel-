'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Package, Store, MapPin, Clock,
  CheckCircle, Circle, XCircle, Star
} from 'lucide-react';
import { Button, Card, Badge, Skeleton, EmptyState, Textarea } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate } from '@/lib/utils';
import { useAppStore } from '@/store';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { Order, Store as StoreType, OrderItem, Product } from '@/types';

type OrderFull = Order & {
  stores: StoreType;
  order_items: (OrderItem & { products: Product })[];
};

export default function OrderDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAppStore((s) => s.user);
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const steps = [
    { key: 'pending', label: t('orders.status.pending') },
    { key: 'confirmed', label: t('orders.status.confirmed') },
    { key: 'preparing', label: t('orders.status.preparing') },
    { key: 'ready', label: t('orders.status.ready') },
    { key: 'picked_up', label: t('orders.status.picked_up') },
    { key: 'on_the_way', label: t('orders.status.on_the_way') },
    { key: 'delivered', label: t('orders.status.delivered') },
  ];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchOrder = async () => {
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, stores(*), order_items(*, products(*))')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setOrder(data);

        // Check if already reviewed
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('order_id', params.id)
          .eq('user_id', user!.id)
          .single();
        if (existingReview) setHasReviewed(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('orders.orderNotFound'));
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchOrder();
  }, [params.id, user, router, t]);

  const handleCancel = async () => {
    if (!order || !window.confirm(t('orders.cancelConfirm'))) return;

    setCancelling(true);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id);

      if (error) throw error;
      setOrder({ ...order, status: 'cancelled' });
      toast('success', t('orders.orderCancelled'));
    } catch (err) {
      toast('error', t('orders.cancelFailed'));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<Package className="w-8 h-8 text-[var(--color-error)]" />}
          title={t('orders.orderNotFound')}
          description={error || t('orders.orderRemoved')}
          action={
            <Button variant="outline" onClick={() => router.push('/orders')}>
              {t('common.viewAll')}
            </Button>
          }
        />
      </div>
    );
  }

  const currentStep = stepIndex(order.status, steps);
  const isCancelled = order.status === 'cancelled';

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
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('orders.orderDetails')}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {(order as any).order_number || `#${order.id.slice(0, 8)}`}
          </p>
        </div>
      </div>

      {isCancelled ? (
        <Card className="mb-6 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 text-red-500">
            <XCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold">{t('orders.status.cancelled')}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {t('orders.cancelFailed')}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mb-6">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">{t('orders.currentStatus')}</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--color-border)]" />
            <div className="space-y-0">
              {steps.map((step, i) => {
                const isCompleted = i <= currentStep && !isCancelled;
                const isCurrent = i === currentStep && !isCancelled;
                return (
                  <div key={step.key} className="flex items-center gap-4 pb-6 last:pb-0 relative">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10',
                      isCompleted && !isCurrent && 'bg-green-500',
                      isCurrent && 'bg-[var(--color-primary)] ring-4 ring-orange-100 dark:ring-orange-900/30',
                      !isCompleted && 'bg-[var(--color-border)]'
                    )}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <Circle className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      )}
                    </div>
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        isCurrent && 'text-[var(--color-primary)] font-semibold',
                        isCompleted && !isCurrent && 'text-green-600 dark:text-green-400',
                        !isCompleted && 'text-[var(--color-text-secondary)]'
                      )}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{t('orders.currentStatus')}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3 mb-6">
        {order.stores && (
          <Card className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-surface)] overflow-hidden shrink-0">
              {order.stores.image_url ? (
                <img src={order.stores.image_url} alt={order.stores.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Store className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)] text-sm">{order.stores.name}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{t('orders.store')}</p>
            </div>
          </Card>
        )}

        {order.delivery_address && (
          <Card className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[var(--color-primary)] mt-0.5" />
            <div>
              <p className="font-medium text-[var(--color-text-primary)] text-sm">{t('checkout.deliveryAddress')}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{order.delivery_address}</p>
            </div>
          </Card>
        )}

        <Card>
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">{t('orders.items')}</h3>
          <div className="space-y-2">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-[var(--color-text-secondary)] shrink-0">{item.quantity}x</span>
                  <span className="text-sm text-[var(--color-text-primary)] truncate">
                    {item.products?.name || 'Product'}
                  </span>
                </div>
                <span className="text-sm font-medium text-[var(--color-text-primary)] shrink-0">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--color-border)] mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">{t('orders.subtotal')}</span>
              <span className="font-medium">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">{t('orders.deliveryFee')}</span>
              <span className="font-medium">{order.delivery_fee === 0 ? t('common.free') : formatPrice(order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-border)] pt-1">
              <span className="font-semibold">{t('checkout.total')}</span>
              <span className="font-bold text-[var(--color-primary)]">{formatPrice(order.total)}</span>
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <div>
            <p className="text-sm text-[var(--color-text-primary)]">{t('orders.ordered')}{formatDate(order.created_at)}</p>
          </div>
        </Card>

        {order.notes && (
          <Card>
            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">{t('orders.notes')}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{order.notes}</p>
          </Card>
        )}
      </div>

      {order.status === 'pending' && !isCancelled && (
        <Button
          variant="danger"
          fullWidth
          isLoading={cancelling}
          onClick={handleCancel}
        >
          <XCircle className="w-5 h-5" />
          {t('orders.cancelOrder')}
        </Button>
      )}

      {order.status === 'delivered' && !isCancelled && (
        <Card className="mt-6">
          {hasReviewed ? (
            <div className="text-center py-4">
              <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2 fill-yellow-500" />
              <p className="font-semibold text-[var(--color-text-primary)]">{t('orders.alreadyReviewed')}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">{t('orders.thankYouFeedback')}</p>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">{t('orders.rateExperience')}</h3>
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'w-8 h-8 transition-colors',
                        star <= reviewRating
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300 dark:text-gray-600'
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
                className="mb-4"
              />
              <Button
                fullWidth
                isLoading={reviewSubmitting}
                disabled={reviewRating === 0}
                onClick={async () => {
                  if (!order || reviewRating === 0) return;
                  setReviewSubmitting(true);
                  try {
                    const supabase = createClient();
                    const { error } = await supabase.from('reviews').insert({
                      user_id: user!.id,
                      store_id: order.store_id,
                      order_id: order.id,
                      rating: reviewRating,
                      comment: reviewComment || null,
                    });
                    if (error) throw error;
                    setHasReviewed(true);
                    toast('success', t('orders.reviewSubmitted'));
                  } catch (err: any) {
                    toast('error', err.message || t('orders.reviewFailed'));
                  } finally {
                    setReviewSubmitting(false);
                  }
                }}
              >
                {t('orders.submitReview')}
              </Button>
            </>
          )}
        </Card>
      )}
    </motion.div>
  );
}

const stepIndex = (status: string, steps: { key: string }[]) => {
  const idx = steps.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
};
