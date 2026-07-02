'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/shared/dashboard-layout';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { ToastProvider } from '@/components/ui';
import { ConfirmProvider } from '@/components/ui';
import {
  LayoutDashboard, UsersRound, Store, ShoppingBag, Tags,
  Bike, TicketPercent, Star, BarChart3, Settings, HeadphonesIcon, MapPin
} from 'lucide-react';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: UsersRound, label: 'Users' },
  { href: '/admin/stores', icon: Store, label: 'Stores' },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { href: '/admin/categories', icon: Tags, label: 'Categories' },
  { href: '/admin/deliveries', icon: Bike, label: 'Deliveries' },
  { href: '/admin/tracking', icon: MapPin, label: 'Live Tracking' },
  { href: '/admin/promotions', icon: TicketPercent, label: 'Promotions' },
  { href: '/admin/reviews', icon: Star, label: 'Reviews' },
  { href: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
  { href: '/admin/support', icon: HeadphonesIcon, label: 'Support' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, setUser } = useAppStore();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) {
        router.push('/login');
        return;
      }
      supabase.from('profiles').select('*').eq('id', authUser.id).single().then(({ data }) => {
        if (!data || data.role !== 'admin') {
          router.push('/');
          return;
        }
        setUser(data);
      });
    });
  }, [router, setUser]);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <DashboardLayout role="admin" navItems={navItems}>
          {children}
        </DashboardLayout>
      </ConfirmProvider>
    </ToastProvider>
  );
}
