'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Star, Clock, MapPin, Minus, Plus, ShoppingCart, StoreIcon,
  ChevronLeft, Truck, Heart
} from 'lucide-react';
import { Button, Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { useToast } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { Store, Product, Category } from '@/types';

type StoreWithCategory = Store & { categories: Category };

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const addToCart = useAppStore((s) => s.addToCart);
  const user = useAppStore((s) => s.user);

  const [store, setStore] = useState<StoreWithCategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStore = async () => {
      const supabase = createClient();
      try {
        const [storeRes, productsRes] = await Promise.all([
          supabase
            .from('stores')
            .select('*, categories(*)')
            .eq('id', params.id)
            .single(),
          supabase
            .from('products')
            .select('*')
            .eq('store_id', params.id)
            .order('is_featured', { ascending: false }),
        ]);

        if (storeRes.error) throw storeRes.error;
        if (productsRes.error) throw productsRes.error;

        setStore(storeRes.data);
        setProducts(productsRes.data || []);

        if (user) {
          const { data: fav } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('store_id', params.id as string)
            .single();
          if (fav) {
            setIsFavorite(true);
            setFavoriteId(fav.id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('store.storeNotFound'));
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchStore();
  }, [params.id]);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    toast('success', `${product.name} ${t('store.addToCart')}`);
  };

  const toggleFavorite = async () => {
    if (!user || !store) return;
    const supabase = createClient();
    try {
      if (isFavorite && favoriteId) {
        await supabase.from('favorites').delete().eq('id', favoriteId);
        setIsFavorite(false);
        setFavoriteId(null);
        toast('success', t('favorites.removedFavorites'));
      } else {
        const { data, error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, store_id: store.id })
          .select('id')
          .single();
        if (error) throw error;
        setIsFavorite(true);
        setFavoriteId(data.id);
        toast('success', t('favorites.addedToFavorites'));
      }
    } catch {
      toast('error', t('favorites.failedFavorites'));
    }
  };

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleQuantity = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = current + delta;
      if (next < 1) return prev;
      return { ...prev, [productId]: next };
    });
  };

  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <Skeleton className="w-full h-48 rounded-2xl mb-4" />
        <Skeleton className="h-8 w-2/3 mb-2" />
        <Skeleton className="h-4 w-full mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<StoreIcon className="w-8 h-8 text-[var(--color-error)]" />}
          title={t('store.storeNotFound')}
          description={error || t('store.storeUnavailable')}
          action={
            <Button variant="outline" onClick={() => router.push('/stores')}>
              {t('common.browseStores')}
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
      className="pb-8"
    >
      <div className="relative h-48 md:h-64 bg-[var(--color-surface)]">
        {store.cover_url ? (
          <img
            src={store.cover_url}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : store.image_url ? (
          <img
            src={store.image_url}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <StoreIcon className="w-16 h-16 text-[var(--color-text-secondary)]" />
          </div>
        )}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          aria-label={t('common.back')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={toggleFavorite}
          className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          aria-label={isFavorite ? t('favorites.removedFavorites') : t('favorites.addedToFavorites')}
        >
          <Heart className={cn('w-5 h-5', isFavorite && 'fill-red-500 text-red-500')} />
        </button>
        {!store.is_open && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="danger" size="md">{t('store.currentlyClosed')}</Badge>
          </div>
        )}
      </div>

      <div className="px-4 -mt-10 relative z-10">
        <div className="flex items-end gap-4 mb-4">
          <div className="w-20 h-20 rounded-2xl border-4 border-[var(--color-background)] bg-[var(--color-surface)] overflow-hidden shadow-lg shrink-0">
            {store.image_url ? (
              <img
                src={store.image_url}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <StoreIcon className="w-8 h-8 text-[var(--color-text-secondary)]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-10">
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] truncate">
              {store.name}
            </h1>
            {store.categories && (
              <p className="text-sm text-[var(--color-text-secondary)]">{store.categories.name}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-surface)] rounded-xl text-sm">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold text-[var(--color-text-primary)]">{store.rating.toFixed(1)}</span>
            <span className="text-[var(--color-text-secondary)]">({store.total_reviews})</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-surface)] rounded-xl text-sm">
            <Clock className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-[var(--color-text-primary)]">{store.estimated_delivery_time} {t('common.min')}</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-surface)] rounded-xl text-sm">
            <Truck className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-[var(--color-text-primary)]">
              {store.delivery_fee === 0 ? t('store.freeDelivery') : formatPrice(store.delivery_fee)}
            </span>
          </div>
        </div>

        <div className="flex gap-4 mb-4 text-sm text-[var(--color-text-secondary)]">
          <span>{t('store.minOrder')}: {formatPrice(store.min_order)}</span>
          <span>{store.total_orders} {t('common.orders')}</span>
        </div>

        {store.description && (
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">{store.description}</p>
        )}
      </div>

      <div className="px-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          {t('store.menuCount', { count: products.length })}
        </h2>

        {products.length === 0 ? (
          <EmptyState
            icon={<StoreIcon className="w-8 h-8 text-[var(--color-text-secondary)]" />}
            title={t('store.noProducts')}
            description={t('store.noProductsDesc')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="flex gap-4 p-3">
                  <div className="w-24 h-24 rounded-xl bg-[var(--color-surface)] overflow-hidden shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <StoreIcon className="w-6 h-6 text-[var(--color-text-secondary)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-[var(--color-text-primary)] text-sm truncate">
                          {product.name}
                        </h3>
                        <span className="font-bold text-[var(--color-primary)] text-sm shrink-0">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {!product.is_available || product.stock <= 0 ? (
                        <Badge variant="danger" size="sm">{t('common.outOfStock')}</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          {quantities[product.id] && quantities[product.id] > 1 ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleQuantity(product.id, -1)}
                                className="w-7 h-7 rounded-lg bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm font-semibold text-[var(--color-text-primary)] w-5 text-center">
                                {quantities[product.id]}
                              </span>
                              <button
                                onClick={() => handleQuantity(product.id, 1)}
                                className="w-7 h-7 rounded-lg bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-text-secondary)]">
                              ~{product.preparation_time} {t('common.min')}
                            </span>
                          )}
                          <Button
                            size="sm"
                            onClick={() => {
                              const qty = quantities[product.id] || 1;
                              for (let i = 0; i < qty; i++) handleAddToCart(product);
                              setQuantities((prev) => ({ ...prev, [product.id]: undefined! }));
                            }}
                            className="shrink-0"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            {t('common.add')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
