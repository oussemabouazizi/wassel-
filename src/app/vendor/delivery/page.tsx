'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bike, MapPin, Star, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import type { DeliveryPerson } from '@/types';
import type { Profile } from '@/types';

type DeliveryWithProfile = DeliveryPerson & { profiles: Profile };

export default function VendorDeliveryPage() {
  const supabase = createClient();
  const { user } = useAppStore();
  const [onlineDelivery, setOnlineDelivery] = useState<DeliveryWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDelivery = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('delivery_persons')
      .select('*, profiles(*)')
      .eq('online_status', 'online')
      .eq('status', 'approved');

    if (data) setOnlineDelivery(data as DeliveryWithProfile[]);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchDelivery();
    const interval = setInterval(fetchDelivery, 10000);
    return () => clearInterval(interval);
  }, [fetchDelivery]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Online Delivery</h1>
        <p className="text-[var(--color-text-secondary)]">{onlineDelivery.length} delivery person(s) available right now</p>
      </div>

      {onlineDelivery.length === 0 ? (
        <EmptyState
          icon={<Bike className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No delivery persons online"
          description="No delivery persons are currently available. Check back soon."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {onlineDelivery.map((dp, i) => (
            <motion.div
              key={dp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Bike className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{dp.profiles?.full_name || 'Unknown'}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-secondary)]">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>{dp.rating?.toFixed(1) || '5.0'}</span>
                      </div>
                      <span>{dp.total_deliveries || 0} deliveries</span>
                      <span className="capitalize">{dp.vehicle_type}</span>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">Online</Badge>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
