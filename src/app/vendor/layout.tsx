'use client';

import { type ReactNode } from 'react';
import { LayoutDashboard, Store, Package, ShoppingBag, BarChart3, Star, Bike } from 'lucide-react';
import DashboardLayout from '@/components/shared/dashboard-layout';
import AdminAiChat from '@/components/chat/admin-chat';

const navItems = [
  { href: '/vendor', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/vendor/store', icon: Store, label: 'My Stores' },
  { href: '/vendor/products', icon: Package, label: 'Products' },
  { href: '/vendor/orders', icon: ShoppingBag, label: 'Orders' },
  { href: '/vendor/delivery', icon: Bike, label: 'Delivery' },
  { href: '/vendor/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/vendor/reviews', icon: Star, label: 'Reviews' },
];

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout role="vendor" navItems={navItems}>
      {children}
      <AdminAiChat />
    </DashboardLayout>
  );
}
