'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowLeft,
  Store, CreditCard, AlertCircle
} from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { useAppStore } from '@/store';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/ui';
import { useI18n } from '@/i18n';

export default function CartPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const cart = useAppStore((s) => s.cart);
  const updateCartQuantity = useAppStore((s) => s.updateCartQuantity);
  const removeFromCart = useAppStore((s) => s.removeFromCart);
  const clearCart = useAppStore((s) => s.clearCart);
  const getCartTotal = useAppStore((s) => s.getCartTotal);
  const getCartCount = useAppStore((s) => s.getCartCount);
  const selectedStoreId = useAppStore((s) => s.selectedStoreId);

  const deliveryFee = getCartTotal() > 50 ? 0 : 5;
  const total = getCartTotal() + deliveryFee;

  if (cart.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4"
      >
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title={t('cart.empty')}
          description={t('cart.emptyDescription')}
          action={
            <Link href="/stores">
              <Button>{t('common.browseStores')}</Button>
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
      className="p-4 max-w-2xl mx-auto pb-32"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('cart.title')}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{getCartCount()} {t('cart.items')}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearCart();
            toast('info', t('cart.cleared'));
          }}
          className="text-red-500"
        >
          <Trash2 className="w-4 h-4" />
          {t('cart.clear')}
        </Button>
      </div>

      {cart[0]?.product.store_id && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-[var(--color-surface)] rounded-xl">
          <Store className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {cart[0].product.store_id === selectedStoreId ? t('cart.fromSelectedStore') : t('cart.mixedStores')}
          </span>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {cart.map((item, index) => (
          <motion.div
            key={item.product.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="flex gap-3 p-3">
              <div className="w-20 h-20 rounded-xl bg-[var(--color-surface)] overflow-hidden shrink-0">
                {item.product.image_url ? (
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
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
                    <h3 className="font-semibold text-[var(--color-text-primary)] text-sm truncate">
                      {item.product.name}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {formatPrice(item.product.price)} {t('cart.each')}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      removeFromCart(item.product.id);
                      toast('info', `${item.product.name} ${t('cart.removed')}`);
                    }}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-red-500 transition-colors shrink-0"
                    aria-label={`${t('common.delete')} ${item.product.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
                      aria-label={t('cart.decreaseQuantity')}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-semibold text-[var(--color-text-primary)] w-7 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
                      aria-label={t('cart.increaseQuantity')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-bold text-[var(--color-primary)] text-sm">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3">
        <Card className="space-y-3">
          <h3 className="font-semibold text-[var(--color-text-primary)]">{t('cart.orderSummary')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">{t('cart.subtotal')}</span>
              <span className="font-medium text-[var(--color-text-primary)]">{formatPrice(getCartTotal())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">{t('cart.deliveryFee')}</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {deliveryFee === 0 ? (
                  <span className="text-green-500">{t('common.free')}</span>
                ) : (
                  formatPrice(deliveryFee)
                )}
              </span>
            </div>
            {getCartTotal() > 0 && getCartTotal() < 50 && (
              <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {t('cart.addMoreForFreeDelivery', { amount: formatPrice(50 - getCartTotal()) })}
              </p>
            )}
            <div className="border-t border-[var(--color-border)] pt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-[var(--color-text-primary)]">{t('cart.total')}</span>
                <span className="font-bold text-[var(--color-primary)] text-lg">
                  {formatPrice(total)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Button
          fullWidth
          size="lg"
          onClick={() => router.push('/checkout')}
        >
          <CreditCard className="w-5 h-5" />
           {t('cart.proceedToCheckout')}
        </Button>
      </div>
    </motion.div>
  );
}
