'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  Navigation,
  Phone,
  MessageCircle,
  Star,
  Clock,
  CheckCircle,
  Package,
} from 'lucide-react';
import { Card, Badge, Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { Order, Profile, DeliveryPerson, OrderStatus } from '@/types';

const DeliveryMap = dynamic(() => import('@/components/tracking/delivery-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-64" />,
});

interface TrackingPanelProps {
  order: Order;
  deliveryPerson: DeliveryPerson & { profiles: Profile };
  storeLocation: { lat: number; lng: number };
}

const statusOrder: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'on_the_way',
  'delivered',
];

function getStatusIndex(status: OrderStatus): number {
  return statusOrder.indexOf(status);
}

function getEtaMinutes(order: Order): number {
  const created = new Date(order.created_at).getTime();
  const now = Date.now();
  const elapsed = (now - created) / 60000;
  const estimated = order.status === 'on_the_way' ? 10 : 25;
  return Math.max(0, Math.round(estimated - elapsed));
}

export default function TrackingPanel({
  order,
  deliveryPerson,
  storeLocation,
}: TrackingPanelProps) {
  const { t } = useI18n();
  const currentIdx = getStatusIndex(order.status);
  const eta = getEtaMinutes(order);

  const statusSteps: { key: OrderStatus; label: string; icon: typeof Package }[] = [
    { key: 'pending', label: t('tracking.orderPlaced'), icon: Package },
    { key: 'confirmed', label: t('tracking.confirmed'), icon: CheckCircle },
    { key: 'preparing', label: t('tracking.preparing'), icon: Package },
    { key: 'ready', label: t('tracking.ready'), icon: Package },
    { key: 'picked_up', label: t('tracking.pickedUp'), icon: Navigation },
    { key: 'on_the_way', label: t('tracking.onTheWay'), icon: Navigation },
    { key: 'delivered', label: t('tracking.delivered'), icon: CheckCircle },
  ];

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden p-0">
          <DeliveryMap
            orderLat={order.delivery_latitude}
            orderLng={order.delivery_longitude}
            storeLat={storeLocation.lat}
            storeLng={storeLocation.lng}
            deliveryPersonId={order.delivery_person_id}
          />
        </Card>
      </motion.div>

      {order.status !== 'delivered' && order.status !== 'cancelled' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-[var(--color-primary)]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('tracking.estimatedArrival')}</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">
                  {eta > 0 ? `${eta} min` : t('tracking.arrivingNow')}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card>
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">{t('tracking.orderStatus')}</h3>
          <div className="relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-[var(--color-border)]" />
            <div className="space-y-0">
              {statusSteps.map((step, i) => {
                const isCompleted = i < currentIdx;
                const isCurrent = i === currentIdx;
                const isPending = i > currentIdx;
                const StepIcon = step.icon;

                return (
                  <motion.div
                    key={step.key}
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1 : 1,
                    }}
                    className="flex items-center gap-3 pb-4 last:pb-0 relative"
                  >
                    <motion.div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors duration-300',
                        isCompleted && 'bg-green-500',
                        isCurrent && 'bg-[var(--color-primary)] ring-4 ring-orange-100 dark:ring-orange-900/30',
                        isPending && 'bg-[var(--color-border)]'
                      )}
                      animate={
                        isCurrent
                          ? {
                              boxShadow: [
                                '0 0 0 0 rgba(255, 107, 0, 0.4)',
                                '0 0 0 8px rgba(255, 107, 0, 0)',
                                '0 0 0 0 rgba(255, 107, 0, 0.4)',
                              ],
                            }
                          : {}
                      }
                      transition={
                        isCurrent
                          ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                          : {}
                      }
                    >
                      <StepIcon
                        className={cn(
                          'w-4 h-4',
                          isCompleted || isCurrent ? 'text-white' : 'text-[var(--color-text-secondary)]'
                        )}
                      />
                    </motion.div>
                    <div>
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isCurrent && 'text-[var(--color-primary)] font-semibold',
                          isCompleted && 'text-green-600 dark:text-green-400',
                          isPending && 'text-[var(--color-text-secondary)]'
                        )}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                          Current status
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Card>
      </motion.div>

      {deliveryPerson && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
              {t('tracking.deliveryPerson')}
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold text-lg shrink-0">
                {deliveryPerson.profiles?.full_name?.charAt(0) || 'D'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--color-text-primary)] truncate">
                  {deliveryPerson.profiles?.full_name || t('tracking.deliveryPerson')}
                </p>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {deliveryPerson.rating?.toFixed(1) || '5.0'}
                  </span>
                </div>
              </div>
              <Badge
                variant={
                  deliveryPerson.online_status === 'online'
                    ? 'success'
                    : deliveryPerson.online_status === 'busy'
                    ? 'warning'
                    : 'gray'
                }
              >
                {deliveryPerson.online_status || t('tracking.offline')}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  if (deliveryPerson.profiles?.phone) {
                    window.location.href = `tel:${deliveryPerson.profiles.phone}`;
                  }
                }}
              >
                <Phone className="w-4 h-4" />
                {t('tracking.call')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  window.location.href = `/chat?order=${order.id}`;
                }}
              >
                <MessageCircle className="w-4 h-4" />
                {t('tracking.message')}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
