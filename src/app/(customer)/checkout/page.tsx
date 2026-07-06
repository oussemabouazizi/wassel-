'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, CreditCard, Store, ShoppingCart, TicketPercent, X, ChevronLeft, AlertCircle, Navigation, Loader2, Check } from 'lucide-react';
import { Button, Input, Textarea, Badge, EmptyState, Skeleton } from '@/components/ui';
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
  const [shareLocation, setShareLocation] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [step, setStep] = useState(1); // 1: address, 2: items, 3: payment

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
        const defaultAddr = data?.find((a: any) => a.is_default) || data?.[0];
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

  useEffect(() => {
    if (!shareLocation) {
      setLiveLocation(null);
      return;
    }
    setGettingLocation(true);
    const watchId = navigator.geolocation?.watchPosition(
      (pos) => {
        setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingLocation(false);
      },
      () => {
        setGettingLocation(false);
        setShareLocation(false);
        toast('error', t('checkout.locationDenied'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
    return () => {
      if (watchId !== undefined) navigator.geolocation?.clearWatch(watchId);
    };
  }, [shareLocation, toast, t]);

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
          delivery_latitude: liveLocation?.lat || selectedAddress?.latitude || 0,
          delivery_longitude: liveLocation?.lng || selectedAddress?.longitude || 0,
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
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
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
    <div className="relative min-h-screen">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-[#FF6B00]/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-gradient-to-tr from-emerald-300/6 to-transparent rounded-full blur-3xl" />
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
            <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('checkout.placeOrder')}</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">{t('checkout.reviewOrder')}</p>
          </div>
        </motion.div>

        {/* Step indicator */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 mb-6"
        >
          {[
            { n: 1, label: t('checkout.deliveryAddress') },
            { n: 2, label: t('checkout.orderItems') },
            { n: 3, label: t('checkout.totalBreakdown') },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => setStep(s.n)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                  step === s.n
                    ? 'bg-gradient-to-r from-[#FF6B00] to-[#E55A00] text-white shadow-lg shadow-orange-500/20'
                    : step > s.n
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                )}
              >
                {step > s.n ? <Check className="w-3.5 h-3.5" /> : <span>{s.n}</span>}
                <span className="hidden sm:inline truncate">{s.label}</span>
              </button>
              {i < 2 && <div className={cn('w-4 h-0.5 shrink-0', step > s.n ? 'bg-emerald-400' : 'bg-[var(--color-border)]')} />}
            </div>
          ))}
        </motion.div>

        {/* Address section */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#FF6B00]" />
                    {t('checkout.deliveryAddress')}
                  </h3>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#FF6B00] bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('common.add')}
                  </button>
                </div>

                {addresses.length === 0 && !showAddForm ? (
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">{t('checkout.noAddresses')}</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {addresses.map((addr) => (
                      <motion.button
                        key={addr.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={cn(
                          'w-full text-left p-3.5 rounded-xl border-2 transition-all',
                          selectedAddressId === addr.id
                            ? 'border-[#FF6B00] bg-[#FF6B00]/5 shadow-md shadow-orange-500/5'
                            : 'border-[var(--color-border)]/50 hover:border-[#FF6B00]/30'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--color-text-primary)]">{addr.label}</span>
                          {addr.is_default && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF6B00] text-white">{t('common.default')}</span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{addr.address}</p>
                      </motion.button>
                    ))}
                  </div>
                )}

                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-3 border-t border-[var(--color-border)]/50"
                  >
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
                      <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)} className="flex-1">
                        {t('common.cancel')}
                      </Button>
                      <Button size="sm" onClick={handleAddAddress} isLoading={addingAddress} disabled={!newLabel.trim() || !newAddress.trim()} className="flex-1 bg-gradient-to-r from-[#FF6B00] to-[#E55A00]">
                        {t('checkout.saveAddress')}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Share Live Location */}
                <div className="pt-3 mt-3 border-t border-[var(--color-border)]/50">
                  <button
                    onClick={() => setShareLocation(!shareLocation)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: shareLocation ? '#FF6B00' : 'var(--color-border)',
                      backgroundColor: shareLocation ? 'rgba(255,107,0,0.05)' : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                        {gettingLocation ? (
                          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                        ) : (
                          <Navigation className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-[var(--color-text-primary)]">{t('checkout.shareLiveLocation')}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {liveLocation
                            ? `${liveLocation.lat.toFixed(4)}, ${liveLocation.lng.toFixed(4)}`
                            : t('checkout.shareLiveLocationDesc')}
                        </p>
                      </div>
                    </div>
                    <div
                      className="w-10 h-6 rounded-full transition-colors flex items-center px-0.5"
                      style={{ backgroundColor: shareLocation ? '#FF6B00' : 'var(--color-border)' }}
                    >
                      <motion.div
                        className="w-5 h-5 bg-white rounded-full shadow"
                        animate={{ x: shareLocation ? 16 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(2)}
                disabled={!selectedAddressId}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#E55A00] text-white font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50"
              >
                {t('common.continue')}
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5">
                <h3 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2 mb-4">
                  <Store className="w-4 h-4 text-[#FF6B00]" />
                  {t('checkout.orderItems')}
                </h3>
                <div className="space-y-2.5">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-[var(--color-surface)] flex items-center justify-center text-xs font-bold text-[var(--color-text-secondary)]">
                          {item.quantity}x
                        </span>
                        <span className="text-sm text-[var(--color-text-primary)] truncate font-medium">{item.product.name}</span>
                      </div>
                      <span className="text-sm font-bold text-[var(--color-text-primary)] shrink-0">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5">
                <Textarea
                  label={t('checkout.orderNotes')}
                  placeholder={t('checkout.orderNotesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-2xl border border-[var(--color-border)] font-bold text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors">
                  {t('common.back')}
                </button>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(3)}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#E55A00] text-white font-bold shadow-lg shadow-orange-500/20"
                >
                  {t('common.continue')}
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Promo code */}
              <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5">
                <h3 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
                  <TicketPercent className="w-4 h-4 text-[#FF6B00]" />
                  {t('checkout.promoCode')}
                </h3>
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800/30">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{appliedPromo.code}</span>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">
                        {appliedPromo.discount_percent > 0 ? `${appliedPromo.discount_percent}% off` : `${formatPrice(appliedPromo.discount_amount)} off`}
                      </span>
                    </div>
                    <button onClick={handleRemovePromo} className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/40">
                      <X className="w-4 h-4 text-emerald-600" />
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
                    <Button onClick={handleApplyPromo} isLoading={validatingPromo} disabled={!promoCode.trim()} variant="outline" className="shrink-0">
                      {t('checkout.apply')}
                    </Button>
                  </div>
                )}
                {promoError && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {promoError}
                  </p>
                )}
              </div>

              {/* Price breakdown */}
              <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 p-5">
                <h3 className="font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#FF6B00]" />
                  {t('checkout.totalBreakdown')}
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">{t('checkout.subtotal')}</span>
                    <span className="font-bold text-[var(--color-text-primary)]">{formatPrice(getCartTotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">{t('checkout.deliveryFee')}</span>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {deliveryFee === 0 ? <span className="text-emerald-500">{t('common.free')}</span> : formatPrice(deliveryFee)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">{t('checkout.discount')}</span>
                      <span className="font-bold text-emerald-500">-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-[var(--color-border)]/50 pt-3">
                    <div className="flex justify-between">
                      <span className="font-bold text-[var(--color-text-primary)]">{t('checkout.total')}</span>
                      <span className="font-extrabold text-[var(--color-primary)] text-xl">{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3.5 rounded-2xl border border-[var(--color-border)] font-bold text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors">
                  {t('common.back')}
                </button>
                <motion.button
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePlaceOrder}
                  disabled={!selectedAddressId || submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#E55A00] text-white font-extrabold shadow-xl shadow-orange-500/25 hover:shadow-2xl transition-all duration-300 disabled:opacity-50"
                >
                  {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CreditCard className="w-5 h-5" />}
                  {t('checkout.placeOrder')} · {formatPrice(total)}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
