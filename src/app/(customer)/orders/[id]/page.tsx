'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Package, Store, MapPin, Clock,
  CheckCircle, Circle, XCircle, Star, Truck, Loader2, AlertTriangle, Bike, ShoppingBag, PackageCheck, Navigation
} from 'lucide-react';
import { Button, Badge, Skeleton, EmptyState, Textarea } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { useToast } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { Order, Store as StoreType, OrderItem, Product } from '@/types';

type OrderFull = Order & {
  stores: StoreType;
  order_items: (OrderItem & { products: Product })[];
};

const statusGradients: Record<string, string> = {
  pending: 'from-amber-500 to-orange-500',
  confirmed: 'from-blue-500 to-indigo-500',
  preparing: 'from-blue-400 to-cyan-500',
  ready: 'from-[#FF6B00] to-amber-500',
  picked_up: 'from-[#FF6B00] to-orange-600',
  on_the_way: 'from-[#FF6B00] to-red-500',
  delivered: 'from-emerald-500 to-green-600',
  cancelled: 'from-red-500 to-rose-600',
};

const statusIconComponents: Record<string, React.ReactNode> = {
  pending: <Clock className="w-5 h-5 text-white" />,
  confirmed: <CheckCircle className="w-5 h-5 text-white" />,
  preparing: <Loader2 className="w-5 h-5 text-white" />,
  ready: <PackageCheck className="w-5 h-5 text-white" />,
  picked_up: <Bike className="w-5 h-5 text-white" />,
  on_the_way: <Navigation className="w-5 h-5 text-white" />,
  delivered: <CheckCircle className="w-5 h-5 text-white" />,
  cancelled: <XCircle className="w-5 h-5 text-white" />,
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
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', params.id)
          .single();

        if (orderError) throw orderError;

        const [storesRes, itemsRes] = await Promise.all([
          supabase.from('stores').select('*').eq('id', orderData.store_id).single(),
          supabase.from('order_items').select('*').eq('order_id', orderData.id),
        ]);

        const store = storesRes.data;
        const items = itemsRes.data || [];

        const productIds = items.map(i => i.product_id).filter(Boolean);
        let products: Record<string, Product> = {};
        if (productIds.length > 0) {
          const { data: prods } = await supabase.from('products').select('*').in('id', productIds);
          if (prods) products = Object.fromEntries(prods.map(p => [p.id, p]));
        }

        const enrichedItems = items.map(i => ({
          ...i,
          products: products[i.product_id] || null,
        }));

        setOrder({
          ...orderData,
          stores: store as StoreType,
          order_items: enrichedItems as any,
        });

        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('order_id', params.id as string)
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
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
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
    <div className="relative min-h-screen">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-[#FF6B00]/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -left-32 w-64 h-64 bg-gradient-to-tr from-emerald-300/6 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('orders.orderDetails')}</h1>
            <p className="text-xs font-mono text-[var(--color-text-secondary)]">
              {(order as any).order_number || `#${order.id.slice(0, 8)}`}
            </p>
          </div>
        </motion.div>

        {/* Status header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6"
        >
          {isCancelled ? (
            <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-200 dark:border-red-800/50 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-red-600 dark:text-red-400">{t('orders.status.cancelled')}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{t('orders.cancelFailed')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5">
              {/* Active status badge */}
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg',
                  statusGradients[order.status]
                )}>
                  {statusIconComponents[order.status]}
                </div>
                <div>
                  <p className="font-bold text-[var(--color-text-primary)] capitalize">
                    {t(`orders.status.${order.status}`)}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{t('orders.currentStatus')}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-[var(--color-surface)] rounded-full overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(((currentStep + 1) / steps.length) * 100, 5)}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FF6B00] to-[#E55A00] rounded-full"
                />
              </div>

              {/* Step timeline */}
              <div className="flex items-center justify-between">
                {steps.map((step, i) => {
                  const isCompleted = i <= currentStep;
                  const isCurrent = i === currentStep;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-1 relative">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 + i * 0.05, type: 'spring', stiffness: 300 }}
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-xs z-10',
                          isCompleted && !isCurrent && 'bg-gradient-to-br from-[#FF6B00] to-[#E55A00] text-white shadow-md',
                          isCurrent && 'bg-gradient-to-br from-[#FF6B00] to-[#E55A00] text-white ring-4 ring-orange-100 dark:ring-orange-900/30 shadow-lg shadow-orange-500/30',
                          !isCompleted && 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                        )}
                      >
                        {isCompleted && !isCurrent ? '✓' : i + 1}
                      </motion.div>
                      {/* Connector line */}
                      {i < steps.length - 1 && (
                        <div className={cn(
                          'absolute top-3.5 left-full w-full h-0.5',
                          i < currentStep ? 'bg-[#FF6B00]' : 'bg-[var(--color-border)]'
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Store info */}
        {order.stores && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-4 mb-4 flex items-center gap-4"
          >
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
              <p className="font-bold text-[var(--color-text-primary)] text-sm">{order.stores.name}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{t('orders.store')}</p>
            </div>
          </motion.div>
        )}

        {/* Delivery address */}
        {order.delivery_address && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-4 mb-4 flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)]">{t('checkout.deliveryAddress')}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{order.delivery_address}</p>
            </div>
          </motion.div>
        )}

        {/* Order items */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5 mb-4"
        >
          <h3 className="font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#FF6B00]" />
            {t('orders.items')}
          </h3>
          <div className="space-y-3 mb-4">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-[var(--color-surface)] flex items-center justify-center text-xs font-bold text-[var(--color-text-secondary)]">
                    {item.quantity}x
                  </span>
                  <span className="text-sm text-[var(--color-text-primary)] truncate font-medium">
                    {item.products?.name || 'Product'}
                  </span>
                </div>
                <span className="text-sm font-bold text-[var(--color-text-primary)] shrink-0">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Price breakdown */}
          <div className="border-t border-[var(--color-border)]/50 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">{t('orders.subtotal')}</span>
              <span className="font-bold">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">{t('orders.deliveryFee')}</span>
              <span className="font-bold">
                {order.delivery_fee === 0 ? (
                  <span className="text-emerald-500">{t('common.free')}</span>
                ) : formatPrice(order.delivery_fee)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-border)]/50 pt-2">
              <span className="font-bold text-[var(--color-text-primary)]">{t('checkout.total')}</span>
              <span className="font-extrabold text-[var(--color-primary)] text-lg">{formatPrice(order.total)}</span>
            </div>
          </div>
        </motion.div>

        {/* Order time */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-4 mb-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-sm text-[var(--color-text-primary)]">{t('orders.ordered')}{formatDate(order.created_at)}</p>
        </motion.div>

        {/* Notes */}
        {order.notes && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-4 mb-4"
          >
            <p className="text-xs font-bold text-[var(--color-text-primary)] mb-1">{t('orders.notes')}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{order.notes}</p>
          </motion.div>
        )}

        {/* Cancel button */}
        {order.status === 'pending' && !isCancelled && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 dark:border-red-800/50 text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 disabled:opacity-50"
            >
              {cancelling ? <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <XCircle className="w-5 h-5" />}
              {t('orders.cancelOrder')}
            </motion.button>
          </motion.div>
        )}

        {/* Review section */}
        {order.status === 'delivered' && !isCancelled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5"
          >
            {hasReviewed ? (
              <div className="text-center py-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-50 dark:bg-yellow-900/20 mb-3"
                >
                  <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                </motion.div>
                <p className="font-bold text-[var(--color-text-primary)]">{t('orders.alreadyReviewed')}</p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('orders.thankYouFeedback')}</p>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#FF6B00]" />
                  {t('orders.rateExperience')}
                </h3>
                {/* Stars */}
                <div className="flex items-center gap-2 justify-center mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setReviewRating(star)}
                      className="p-0.5"
                    >
                      <Star
                        className={cn(
                          'w-10 h-10 transition-all duration-200',
                          star <= reviewRating
                            ? 'text-yellow-500 fill-yellow-500 drop-shadow-lg'
                            : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'
                        )}
                      />
                    </motion.button>
                  ))}
                </div>
                {reviewRating > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-sm font-medium text-[var(--color-text-secondary)] mb-4"
                  >
                    {reviewRating === 5 ? '⭐ Excellent!' : reviewRating >= 4 ? '😊 Great' : reviewRating >= 3 ? '🙂 Good' : reviewRating >= 2 ? '😕 Okay' : '😞 Poor'}
                  </motion.p>
                )}
                <Textarea
                  placeholder={t('orders.reviewPlaceholder')}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  className="mb-4"
                />
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={reviewRating === 0 || reviewSubmitting}
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
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#E55A00] text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                >
                  {reviewSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Star className="w-4 h-4" />}
                  {t('orders.submitReview')}
                </motion.button>
              </>
            )}
          </motion.div>
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

const stepIndex = (status: string, steps: { key: string }[]) => {
  const idx = steps.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
};
