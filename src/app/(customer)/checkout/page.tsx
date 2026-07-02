'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Plus, CreditCard, Store, ShoppingCart, TicketPercent, X, ChevronLeft, AlertCircle } from 'lucide-react';
import { Button, Card, Input, Textarea, Badge, EmptyState, Skeleton } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { useToast } from '@/components/ui';
import { notifyVendorNewOrder } from '@/lib/notify';
import { useI18n } from '@/i18n';
import type { Address, PromoCode } from '@/types';

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const cart = useAppStore((s) => s.cart);
  const clearCart = useAppStore((s) => s.clearCart);
  const getCartTotal = useAppStore((s) => s.getCartTotal);
  const user = useAppStore((s) => s.user);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [storeDeliveryFee, setStoreDeliveryFee] = useState(5);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);

  const deliveryFee = storeDeliveryFee;
  const discount = appliedPromo
    ? appliedPromo.discount_percent > 0
      ? Math.min(
          (getCartTotal() * appliedPromo.discount_percent) / 100,
          appliedPromo.max_discount || Infinity
        )
      : appliedPromo.discount_amount
    : 0;
  const total = getCartTotal() + deliveryFee - discount;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchAddresses = async () => {
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        if (error) throw error;
        setAddresses(data || []);
        const defaultAddr = data?.find((a) => a.is_default) || data?.[0];
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      } catch (err) {
        toast('error', t('checkout.failedLoadAddresses'));
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [user, router, toast, t]);

  useEffect(() => {
    if (cart.length > 0 && cart[0].product.store_id) {
      const supabase = createClient();
      supabase.from('stores').select('delivery_fee').eq('id', cart[0].product.store_id).single()
        .then(({ data }) => {
          if (data) setStoreDeliveryFee(data.delivery_fee || 0);
        });
    }
  }, [cart]);

  useEffect(() => {
    if (cart.length === 0 && !loading) {
      toast('info', t('checkout.cartEmpty'));
      router.push('/stores');
    }
  }, [cart, loading, router, toast, t]);

  const handleAddAddress = async () => {
    if (!newLabel.trim() || !newAddress.trim() || !user) return;
    setAddingAddress(true);
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          label: newLabel.trim(),
          address: newAddress.trim(),
          latitude: 0,
          longitude: 0,
          is_default: addresses.length === 0,
        })
        .select()
        .single();

      if (error) throw error;
      setAddresses((prev) => [...prev, data]);
      setSelectedAddressId(data.id);
      setNewLabel('');
      setNewAddress('');
      setShowAddForm(false);
      toast('success', t('checkout.addressAdded'));
    } catch (err) {
      toast('error', t('checkout.failedAddAddress'));
    } finally {
      setAddingAddress(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    setPromoError('');
    setAppliedPromo(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .ilike('code', promoCode.trim())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setPromoError(t('checkout.invalidPromo'));
        return;
      }

      const now = new Date();
      if (new Date(data.valid_until) < now) {
        setPromoError(t('checkout.promoExpired'));
        return;
      }
      if (new Date(data.valid_from) > now) {
        setPromoError(t('checkout.promoNotValidYet'));
        return;
      }
      if (data.current_uses >= data.max_uses) {
        setPromoError(t('checkout.promoFullyUsed'));
        return;
      }
      if (data.min_order > 0 && getCartTotal() < data.min_order) {
        setPromoError(t('checkout.promoMinOrder', { amount: formatPrice(data.min_order) }));
        return;
      }
      if (data.store_id && cart[0]?.product.store_id !== data.store_id) {
        setPromoError(t('checkout.promoNotForStore'));
        return;
      }

      setAppliedPromo(data);
      setPromoError('');
      toast('success', t('checkout.promoApplied'));
    } catch {
      setPromoError(t('checkout.invalidPromo'));
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
  };

  const handlePlaceOrder = async () => {
    if (!user || !selectedAddressId) {
      toast('error', t('checkout.selectAddressError'));
      return;
    }
    if (cart.length === 0) {
      toast('error', t('checkout.cartEmpty'));
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    const orderNumber = 'ORD-' + Date.now() + Math.floor(Math.random() * 900 + 100);

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: user.id,
          store_id: cart[0].product.store_id,
          status: 'pending',
          subtotal: getCartTotal(),
          delivery_fee: deliveryFee,
          discount: discount,
          total: total,
          delivery_address_id: selectedAddressId,
          delivery_address: selectedAddress?.address || '',
          delivery_latitude: selectedAddress?.latitude || 0,
          delivery_longitude: selectedAddress?.longitude || 0,
          notes: notes || null,
          tip: 0,
          promo_code_id: appliedPromo?.id || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      const { data: store } = await supabase
        .from('stores')
        .select('owner_id, name')
        .eq('id', cart[0].product.store_id)
        .single();

      if (store) {
        notifyVendorNewOrder(order.id, store.name, user.full_name || user.email, total, store.owner_id);
      }

      if (appliedPromo) {
        await supabase
          .from('promo_codes')
          .update({ current_uses: appliedPromo.current_uses + 1 })
          .eq('id', appliedPromo.id);
      }

      clearCart();
      toast('success', t('checkout.orderPlaced'));
      router.push(`/orders/${order.id}`);
    } catch (err) {
      toast('error', t('checkout.orderFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-1/3 mb-6" />
        <Skeleton className="h-32 rounded-2xl mb-4" />
        <Skeleton className="h-40 rounded-2xl mb-4" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title={t('checkout.nothingToCheckout')}
          description={t('checkout.addItemFirst')}
          action={
            <Button onClick={() => router.push('/stores')}>{t('common.browseStores')}</Button>
          }
        />
      </div>
    );
  }

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
          aria-label={t('common.back')}
        >
          <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('checkout.placeOrder')}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{t('checkout.reviewOrder')}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
              {t('checkout.deliveryAddress')}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="w-4 h-4" />
              {t('common.add')}
            </Button>
          </div>

          {addresses.length === 0 && !showAddForm ? (
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">
              {t('checkout.noAddresses')}
            </p>
          ) : (
            <div className="space-y-2 mb-3">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border-2 transition-all',
                    selectedAddressId === addr.id
                      ? 'border-[var(--color-primary)] bg-orange-50 dark:bg-orange-900/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/30'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{addr.label}</span>
                    {addr.is_default && <Badge variant="primary" size="sm">{t('common.default')}</Badge>}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{addr.address}</p>
                </button>
              ))}
            </div>
          )}

          {showAddForm && (
            <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
              <Input
                label={t('checkout.addLabel')}
                placeholder={t('checkout.labelPlaceholder')}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
              <Input
                label={t('checkout.addressLabel')}
                placeholder={t('checkout.addressPlaceholder')}
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddAddress}
                  isLoading={addingAddress}
                  disabled={!newLabel.trim() || !newAddress.trim()}
                >
                  {t('checkout.saveAddress')}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-4">
            <Store className="w-4 h-4 text-[var(--color-primary)]" />
            {t('checkout.orderItems')}
          </h3>
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-[var(--color-text-secondary)] shrink-0">{item.quantity}x</span>
                  <span className="text-sm text-[var(--color-text-primary)] truncate">{item.product.name}</span>
                </div>
                <span className="text-sm font-medium text-[var(--color-text-primary)] shrink-0">
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">{t('checkout.totalBreakdown')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">{t('checkout.subtotal')}</span>
              <span className="font-medium text-[var(--color-text-primary)]">{formatPrice(getCartTotal())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">{t('checkout.deliveryFee')}</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {deliveryFee === 0 ? <span className="text-green-500">{t('common.free')}</span> : formatPrice(deliveryFee)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">{t('checkout.discount')}</span>
                <span className="font-medium text-green-500">-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="border-t border-[var(--color-border)] pt-2 flex justify-between">
              <span className="font-semibold text-[var(--color-text-primary)]">{t('checkout.total')}</span>
              <span className="font-bold text-[var(--color-primary)] text-lg">{formatPrice(total)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <Textarea
            label={t('checkout.orderNotes')}
            placeholder={t('checkout.orderNotesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </Card>

        <Card>
          <h3 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
            <TicketPercent className="w-4 h-4 text-[var(--color-primary)]" />
            {t('checkout.promoCode')}
          </h3>
          {appliedPromo ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div>
                <span className="font-mono font-bold text-green-700 dark:text-green-400">{appliedPromo.code}</span>
                <span className="text-sm text-green-600 dark:text-green-300 ml-2">
                  {appliedPromo.discount_percent > 0
                    ? `${appliedPromo.discount_percent}% off`
                    : `${formatPrice(appliedPromo.discount_amount)} off`}
                </span>
              </div>
              <button onClick={handleRemovePromo} className="p-1 rounded-lg hover:bg-green-100 dark:hover:bg-green-800/40">
                <X className="w-4 h-4 text-green-600 dark:text-green-400" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder={t('checkout.enterPromoCode')}
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
              />
              <Button
                onClick={handleApplyPromo}
                isLoading={validatingPromo}
                disabled={!promoCode.trim()}
                variant="outline"
              >
                {t('checkout.apply')}
              </Button>
            </div>
          )}
          {promoError && (
            <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {promoError}
            </p>
          )}
        </Card>

        <Button
          fullWidth
          size="lg"
          isLoading={submitting}
          onClick={handlePlaceOrder}
          disabled={!selectedAddressId}
        >
          <CreditCard className="w-5 h-5" />
          {t('checkout.placeOrder')} - {formatPrice(total)}
        </Button>
      </div>
    </motion.div>
  );
}
