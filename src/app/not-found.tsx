'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, Search } from 'lucide-react';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl font-extrabold text-[#FF6B00]/20 mb-4">404</div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          {t('common.pageNotFound') || 'Page not found'}
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          {t('common.pageNotFoundDesc') || 'The page you are looking for does not exist or has been moved.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button className="gap-2">
              <Home className="w-4 h-4" />
              {t('nav.home') || 'Home'}
            </Button>
          </Link>
          <Link href="/stores">
            <Button variant="outline" className="gap-2">
              <Search className="w-4 h-4" />
              {t('nav.explore') || 'Explore'}
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
