'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowLeft,
  Store, CreditCard, AlertCircle, ChevronLeft, ShoppingBag
} from 'lucide-react';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { useAppStore } from '@/store';
import { formatPrice, cn } from '@/lib/utils';
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
      <div className="relative min-h-screen">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-[#FF6B00]/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 -left-32 w-64 h-64 bg-gradient-to-tr from-amber-300/8 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="p-4 sm:p-6 max-w-2xl mx-auto pt-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <EmptyState
              icon={<ShoppingBag className="w-10 h-10 text-[var(--color-text-secondary)]" />}
              title={t('cart.empty')}
              description={t('cart.emptyDescription')}
              action={
                <Link href="/stores">
                  <Button className="bg-gradient-to-r from-[#FF6B00] to-[#E55A00] shadow-lg shadow-orange-500/20">
                    {t('common.browseStores')}
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
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-gradient-to-br from-[#FF6B00]/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-gradient-to-tr from-amber-300/6 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-border)]/50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('cart.title')}</h1>
              <p className="text-xs text-[var(--color-text-secondary)]">{getCartCount()} {t('cart.items')}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              clearCart();
              toast('info', t('cart.cleared'));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/15 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('cart.clear')}
          </motion.button>
        </motion.div>

        {/* Store badge */}
        {cart[0]?.product.store_id && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]/30"
          >
            <Store className="w-4 h-4 text-[#FF6B00]" />
            <span className="text-xs font-bold text-[var(--color-text-primary)]">
              {cart[0].product.store_id === selectedStoreId ? t('cart.fromSelectedStore') : t('cart.mixedStores')}
            </span>
          </motion.div>
        )}

        {/* Cart items */}
        <div className="space-y-3 mb-6">
          <AnimatePresence mode="popLayout">
            {cart.map((item, index) => (
              <motion.div
                key={item.product.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -100, scale: 0.9 }}
                transition={{ delay: index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 overflow-hidden hover:shadow-lg hover:shadow-black/5 transition-all duration-300">
                  <div className="flex gap-3 p-4">
                    {/* Product image */}
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

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-[var(--color-text-primary)] text-sm truncate">
                            {item.product.name}
                          </h3>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                            {formatPrice(item.product.price)} {t('cart.each')}
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            removeFromCart(item.product.id);
                            toast('info', `${item.product.name} ${t('cart.removed')}`);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-secondary)] hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>

                      {/* Quantity + price */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-0.5 bg-[var(--color-surface)] rounded-xl p-0.5">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-background)] transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </motion.button>
                          <span className="text-sm font-extrabold text-[var(--color-text-primary)] w-8 text-center">
                            {item.quantity}
                          </span>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-background)] transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                        <span className="font-extrabold text-[var(--color-primary)] text-sm">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5 mb-4"
        >
          <h3 className="font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#FF6B00]" />
            {t('cart.orderSummary')}
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">{t('cart.subtotal')}</span>
              <span className="font-bold text-[var(--color-text-primary)]">{formatPrice(getCartTotal())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">{t('cart.deliveryFee')}</span>
              <span className="font-bold text-[var(--color-text-primary)]">
                {deliveryFee === 0 ? (
                  <span className="text-emerald-500">{t('common.free')}</span>
                ) : (
                  formatPrice(deliveryFee)
                )}
              </span>
            </div>
            {getCartTotal() > 0 && getCartTotal() < 50 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/30">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  {t('cart.addMoreForFreeDelivery', { amount: formatPrice(50 - getCartTotal()) })}
                </p>
              </div>
            )}
            <div className="border-t border-[var(--color-border)]/50 pt-3">
              <div className="flex justify-between">
                <span className="font-bold text-[var(--color-text-primary)]">{t('cart.total')}</span>
                <span className="font-extrabold text-[var(--color-primary)] text-lg">
                  {formatPrice(total)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Checkout button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/checkout')}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#E55A00] text-white font-extrabold text-base shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300"
          >
            <CreditCard className="w-5 h-5" />
            {t('cart.proceedToCheckout')} · {formatPrice(total)}
          </motion.button>
        </motion.div>
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
