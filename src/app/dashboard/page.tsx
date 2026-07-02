'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store';

export default function DashboardRedirect() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    const role = user.role || 'customer';
    if (role === 'admin' || role === 'vendor' || role === 'delivery') {
      router.replace(`/${role}`);
    } else {
      router.replace('/');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
