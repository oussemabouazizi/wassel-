'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export default function NavigationLoader() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setLoading(true);
      prevPath.current = pathname;
      const timeout = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5">
      <div className="h-full bg-[var(--color-primary)]" style={{ width: '60%', animation: 'loading-bar 1.5s ease-in-out infinite' }} />
      <style>{`@keyframes loading-bar { 0% { transform: translateX(-100%); } 50% { transform: translateX(200%); } 100% { transform: translateX(-100%); } }`}</style>
    </div>
  );
}
