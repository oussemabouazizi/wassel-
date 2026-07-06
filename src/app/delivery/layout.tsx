'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import DashboardLayout from '@/components/shared/dashboard-layout';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { LayoutDashboard, Bike, ShoppingBag, Clock, DollarSign, MessageSquare } from 'lucide-react';

const navItems = [
  { href: '/delivery', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/delivery/active', icon: Bike, label: 'Active' },
  { href: '/delivery/available', icon: ShoppingBag, label: 'Available' },
  { href: '/delivery/history', icon: Clock, label: 'History' },
  { href: '/delivery/earnings', icon: DollarSign, label: 'Earnings' },
  { href: '/delivery/chat', icon: MessageSquare, label: 'Chat' },
];

export default function DeliveryLayout({ children }: { children: ReactNode }) {
  const user = useAppStore((s) => s.user);
  const watchIdRef = useRef<number | null>(null);
  const offlineSentRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    let cancelled = false;
    offlineSentRef.current = false;

    const sendLocation = async (lat: number, lng: number) => {
      if (cancelled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || cancelled) return;
      await fetch('/api/delivery/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      }).catch(() => {});
    };

    const goOffline = () => {
      if (offlineSentRef.current) return;
      offlineSentRef.current = true;
      // Set offline directly in DB via Supabase client (has auth internally)
      // Can't use fetch/AJAX in beforeunload — browser kills async
      supabase.from('delivery_persons')
        .update({ online_status: 'offline', latitude: 0, longitude: 0 })
        .eq('user_id', user.id)
        .then(() => {});
    };

    const startTracking = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || cancelled) return;

      // Set online
      await supabase.from('delivery_persons')
        .update({ online_status: 'online' })
        .eq('user_id', user.id);

      // Start GPS tracking
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
          () => {},
          { enableHighAccuracy: true, timeout: 10000 }
        );

        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
          () => {},
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );
      }
    };

    startTracking();

    window.addEventListener('beforeunload', goOffline);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', goOffline);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      goOffline();
    };
  }, [user]);

  return (
    <DashboardLayout role="delivery" navItems={navItems}>
      {children}
    </DashboardLayout>
  );
}
