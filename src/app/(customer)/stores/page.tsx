'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Star, StoreIcon, MapPin, Clock, ChevronRight } from 'lucide-react';
import { Input, Tabs, Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { Store, Category } from '@/types';

type StoreWithCategory = Store & { categories: Category };

export default function StoresPage() {
  const { t } = useI18n();
  const [stores, setStores] = useState<StoreWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      try {
        const [storesRes, catsRes] = await Promise.all([
          supabase
            .from('stores')
            .select('*, categories(*)')
            .eq('status', 'approved')
            .eq('is_open', true)
            .order('total_orders', { ascending: false }),
          supabase
            .from('categories')
            .select('*')
            .order('sort_order'),
        ]);

        if (storesRes.error) throw storesRes.error;
        if (catsRes.error) throw catsRes.error;

        setStores(storesRes.data || []);
        setCategories(catsRes.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stores');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesSearch = store.name.toLowerCase().includes(search.toLowerCase()) ||
        store.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'all' || store.category_id === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [stores, search, activeCategory]);

  const tabs = [
    { id: 'all', label: 'All' },
    ...categories.map((cat) => ({ id: cat.id, label: cat.name })),
  ];

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-0 overflow-hidden">
          <Skeleton className="w-full h-40 rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (error) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<StoreIcon className="w-8 h-8 text-[var(--color-error)]" />}
          title="Something went wrong"
          description={error}
          action={
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold"
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 max-w-6xl mx-auto"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Stores</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Discover stores near you</p>
      </div>

      <div className="mb-4">
        <Input
          placeholder={t('home.searchPlaceholder')}
          icon={<Search className="w-5 h-5" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {categories.length > 0 && (
        <div className="mb-6 overflow-x-auto -mx-4 px-4">
          <div className="min-w-max">
            <Tabs
              tabs={tabs.slice(0, 8)}
              activeTab={activeCategory}
              onChange={setActiveCategory}
            />
          </div>
        </div>
      )}

      {loading ? (
        renderSkeletons()
      ) : filteredStores.length === 0 ? (
        <EmptyState
          icon={<StoreIcon className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No stores found"
          description={search ? 'Try a different search term' : 'No stores available in this category yet'}
          action={
            search ? (
              <button
                onClick={() => setSearch('')}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold"
              >
                Clear search
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map((store, index) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/store/${store.id}`}>
                <Card hover className="p-0 overflow-hidden h-full">
                  <div className="relative h-40 bg-[var(--color-surface)]">
                    {store.image_url && !store.image_url.includes('placeholder') ? (
                      <img
                        src={store.image_url}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <StoreIcon className="w-12 h-12 text-[var(--color-text-secondary)]" />
                      </div>
                    )}
                    {store.total_orders > 100 && (
                      <Badge variant="primary" className="absolute top-3 left-3">
                        Popular
                      </Badge>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {store.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-[var(--color-text-primary)]">{store.name}</h3>
                        {store.categories && (
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                            {store.categories.name}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] mt-1 shrink-0" />
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3">
                      {store.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {store.address ? store.address.split(',')[0] : 'Nearby'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {store.estimated_delivery_time} min
                      </span>
                      <span className="font-semibold text-[var(--color-primary)]">
                        {store.delivery_fee === 0 ? 'Free' : formatPrice(store.delivery_fee)}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
