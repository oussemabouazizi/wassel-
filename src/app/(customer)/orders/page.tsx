'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Store, ChevronRight, ChevronLeft, Package, Star, Repeat, Filter, ShoppingBag, CheckCircle, Loader2, PackageCheck, Bike, Navigation, XCircle } from 'lucide-react';
import { Badge, Skeleton, EmptyState, Button, Textarea, Modal } from '@/components/ui';
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

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3 text-white" />,
  confirmed: <CheckCircle className="w-3 h-3 text-white" />,
  preparing: <Loader2 className="w-3 h-3 text-white" />,
  ready: <PackageCheck className="w-3 h-3 text-white" />,
  picked_up: <Bike className="w-3 h-3 text-white" />,
  on_the_way: <Navigation className="w-3 h-3 text-white" />,
  delivered: <CheckCircle className="w-3 h-3 text-white" />,
  cancelled: <XCircle className="w-3 h-3 text-white" />,
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
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [filterOpen, setFilterOpen] = useState(false);

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

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'].includes(order.status);
    if (filter === 'delivered') return order.status === 'delivered';
    if (filter === 'cancelled') return order.status === 'cancelled';
    return true;
  });

  const activeCount = orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'].includes(o.status)).length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-12 rounded-2xl" />
        {Array.from({ length: 3 }).map((_, i) => (
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
      <div className="relative min-h-screen">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-gradient-to-br from-[#FF6B00]/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-gradient-to-tr from-blue-300/8 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="p-4 sm:p-6 max-w-2xl mx-auto pt-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <EmptyState
              icon={<ShoppingBag className="w-10 h-10 text-[var(--color-text-secondary)]" />}
              title={t('orders.noOrders')}
              description={t('orders.noOrdersDesc')}
              action={
                <Link href="/stores">
                  <Button className="bg-gradient-to-r from-[#FF6B00] to-[#E55A00] shadow-lg shadow-orange-500/20">
                    {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              }
            />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-[#FF6B00]/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-gradient-to-tr from-amber-300/6 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-gradient-to-t from-orange-200/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 mb-2"
        >
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('orders.title')}</h1>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-3 gap-3 mb-6 mt-4"
        >
          <div className="bg-[var(--color-background)] rounded-2xl p-3 border border-[var(--color-border)]/50 text-center">
            <div className="text-2xl font-extrabold text-[var(--color-text-primary)]">{orders.length}</div>
            <div className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mt-0.5">{t('orders.allOrders')}</div>
          </div>
          <div className="bg-[var(--color-background)] rounded-2xl p-3 border border-[var(--color-border)]/50 text-center">
            <div className="text-2xl font-extrabold text-[#FF6B00]">{activeCount}</div>
            <div className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mt-0.5">{t('orders.active')}</div>
          </div>
          <div className="bg-[var(--color-background)] rounded-2xl p-3 border border-[var(--color-border)]/50 text-center">
            <div className="text-2xl font-extrabold text-emerald-500">{deliveredCount}</div>
            <div className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mt-0.5">{t('orders.status.delivered')}</div>
          </div>
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none"
        >
          {(['all', 'active', 'delivered', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200',
                filter === f
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#E55A00] text-white shadow-lg shadow-orange-500/20'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]/50'
              )}
            >
              {f === 'all' ? t('common.all') : f === 'active' ? t('orders.active') : f === 'delivered' ? t('orders.status.delivered') : t('orders.status.cancelled')}
            </button>
          ))}
        </motion.div>

        {/* Orders list */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order, index) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href={`/orders/${order.id}`}>
                  <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-4 hover:shadow-lg hover:shadow-black/5 hover:border-[#FF6B00]/20 transition-all duration-300 group">
                    <div className="flex items-center gap-4">
                      {/* Store image */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-xl bg-[var(--color-surface)] overflow-hidden">
                          {order.stores?.image_url ? (
                            <img
                              src={order.stores.image_url}
                              alt={order.stores.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Store className="w-6 h-6 text-[var(--color-text-secondary)]" />
                            </div>
                          )}
                        </div>
                        {/* Status dot */}
                        <div className={cn(
                          'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-br shadow-lg',
                          statusGradients[order.status]
                        )}>
                          {statusIcons[order.status]}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-bold text-[var(--color-text-primary)] text-sm truncate group-hover:text-[#FF6B00] transition-colors">
                              {order.stores?.name || t('orders.store')}
                            </h3>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 font-mono">
                              {(order as any).order_number || `#${order.id.slice(0, 8)}`}
                            </p>
                          </div>
                          <Badge variant={statusVariants[order.status] || 'gray'} size="sm">
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2.5">
                          <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(order.created_at)}
                          </span>
                          <span className="text-sm font-extrabold text-[var(--color-primary)]">
                            {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 group-hover:text-[#FF6B00] group-hover:translate-x-1 transition-all" />
                    </div>

                    {/* Action buttons */}
                    {(order.status === 'delivered') && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border)]/30">
                        {order.stores?.id && !reviewedOrderIds.has(order.id) && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setReviewOrderId(order.id);
                              setReviewStoreId(order.stores!.id);
                              setReviewRating(0);
                              setReviewComment('');
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[#FF6B00] bg-[#FF6B00]/10 rounded-xl hover:bg-[#FF6B00]/20 transition-all duration-200"
                          >
                            <Star className="w-3.5 h-3.5" /> {t('orders.rateOrder')}
                          </button>
                        )}
                        {reviewedOrderIds.has(order.id) && (
                          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl">
                            <Star className="w-3.5 h-3.5 fill-emerald-500" /> {t('orders.reviewed')}
                          </div>
                        )}
                        {order.stores?.id && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleReorder(order.id);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[var(--color-primary)] bg-[var(--color-surface)] border border-[var(--color-border)]/50 rounded-xl hover:bg-[var(--color-primary)]/10 transition-all duration-200"
                          >
                            <Repeat className="w-3.5 h-3.5" /> {t('orders.reorder')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredOrders.length === 0 && orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-bold text-[var(--color-text-primary)]">{t('common.noResults')}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{t('common.tryDifferentFilter')}</p>
          </motion.div>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewOrderId}
        onClose={() => setReviewOrderId(null)}
        title={t('orders.rateExperience')}
      >
        <div className="space-y-5">
          {/* Star rating */}
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center mb-2">
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
                      'w-12 h-12 transition-all duration-200',
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
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium text-[var(--color-text-secondary)]"
              >
                {reviewRating === 5 ? '⭐ Excellent!' : reviewRating >= 4 ? '😊 Great' : reviewRating >= 3 ? '🙂 Good' : reviewRating >= 2 ? '😕 Okay' : '😞 Poor'}
              </motion.p>
            )}
          </div>
          <Textarea
            placeholder={t('orders.reviewPlaceholder')}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={3}
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setReviewOrderId(null)} className="flex-1">{t('common.cancel')}</Button>
            <Button onClick={handleSubmitReview} isLoading={reviewSubmitting} disabled={reviewRating === 0} className="flex-1 bg-gradient-to-r from-[#FF6B00] to-[#E55A00]">
              <Star className="w-4 h-4" /> {t('common.submit')}
            </Button>
          </div>
        </div>
      </Modal>

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
