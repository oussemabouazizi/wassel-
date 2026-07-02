'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Store, Bike, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui';

const benefits = [
  { icon: Store, title: 'Grow your business', desc: 'Reach thousands of new customers in your area. Increase your revenue with zero upfront cost.' },
  { icon: Bike, title: 'Fast delivery', desc: 'Our network of delivery persons ensures your orders reach customers quickly and safely.' },
  { icon: Shield, title: 'Secure payments', desc: 'Get paid reliably. Cash on delivery handled by our verified delivery partners.' },
];

const steps = [
  'Create your account as a Vendor',
  'Add your store and products',
  'Start receiving orders',
  'Get paid on every delivery',
];

export default function BusinessPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-[0.2em]">For Business</span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--color-text-primary)] mt-3 mb-6">
              Grow your business with <span className="text-[#FF6B00]">Wassel</span>
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10">
              Join hundreds of stores already using Wassel to reach more customers and increase sales.
            </p>
            <Link href="/register">
              <Button size="lg" className="rounded-xl gap-2 shadow-lg shadow-orange-500/25">
                Get started <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 bg-[var(--color-surface)]/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)]">Why partner with us?</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {benefits.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="bg-[var(--color-background)] rounded-2xl p-6 border border-[var(--color-border)] text-center">
                  <div className="w-12 h-12 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <b.icon className="w-6 h-6 text-[#FF6B00]" />
                  </div>
                  <h3 className="font-bold text-[var(--color-text-primary)] mb-2">{b.title}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold text-[var(--color-text-primary)] text-center mb-10">How to get started</h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#FF6B00] text-white rounded-full flex items-center justify-center font-bold shrink-0">
                  {i + 1}
                </div>
                <p className="text-[var(--color-text-primary)] font-medium">{step}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/register">
              <Button size="lg" className="rounded-xl gap-2">
                Start now <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
