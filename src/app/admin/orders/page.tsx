'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ShoppingBag, AlertTriangle, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button, Input, Select, Badge, Modal, Card, Skeleton, EmptyState } from '@/components/ui';
import type { Order, OrderStatus } from '@/types';

interface OrderWithDetails extends Order {
  profiles: { full_name: string } | null;
  stores: { name: string } | null;
}

const statusBadge: Record<OrderStatus, 'warning' | 'info' | 'success' | 'danger' | 'primary' | 'gray'> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'info',
  ready: 'info',
  picked_up: 'primary',
  on_the_way: 'primary',
  delivered: 'success',
  cancelled: 'danger',
};

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'on_the_way', label: 'On The Way' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      let query = supabase
        .from('orders')
        .select('*, profiles!orders_customer_id_fkey(full_name), stores!orders_store_id_fkey(name)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setOrders((data || []) as unknown as OrderWithDetails[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = search
    ? orders.filter((o) => o.order_number.toLowerCase().includes(search.toLowerCase()))
    : orders;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Orders</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">View and manage all orders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search by order number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={statusOptions}
          className="w-full sm:w-48"
        />
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="w-12 h-12 text-[var(--color-error)] mb-4" />
          <p className="text-[var(--color-error)] font-medium">{error}</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No orders found"
          description="There are no orders matching your criteria"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-medium">Order</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-medium">Customer</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-medium hidden md:table-cell">Store</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-[var(--color-text-secondary)] font-medium">Total</th>
                  <th className="text-right py-3 px-4 text-[var(--color-text-secondary)] font-medium hidden lg:table-cell">Date</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, i) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">{order.order_number}</td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">{order.profiles?.full_name}</td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)] hidden md:table-cell">{order.stores?.name}</td>
                    <td className="py-3 px-4">
                      <Badge variant={statusBadge[order.status]}>{order.status.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--color-text-primary)] font-medium">{formatPrice(order.total)}</td>
                    <td className="py-3 px-4 text-right text-[var(--color-text-secondary)] text-xs hidden lg:table-cell">{formatDate(order.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Order Details" size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Order Number</p>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{selectedOrder.order_number}</p>
              </div>
              <Badge variant={statusBadge[selectedOrder.status]} size="md">{selectedOrder.status.replace(/_/g, ' ')}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--color-text-secondary)]">Customer</p>
                <p className="text-[var(--color-text-primary)] font-medium">{selectedOrder.profiles?.full_name}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)]">Store</p>
                <p className="text-[var(--color-text-primary)] font-medium">{selectedOrder.stores?.name}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)]">Subtotal</p>
                <p className="text-[var(--color-text-primary)] font-medium">{formatPrice(selectedOrder.subtotal)}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)]">Delivery Fee</p>
                <p className="text-[var(--color-text-primary)] font-medium">{formatPrice(selectedOrder.delivery_fee)}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)]">Total</p>
                <p className="text-[var(--color-text-primary)] font-semibold">{formatPrice(selectedOrder.total)}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)]">Delivery Person</p>
                <p className="text-[var(--color-text-primary)] font-medium">{'Not assigned'}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)]">Delivery Address</p>
                <p className="text-[var(--color-text-primary)] font-medium">{selectedOrder.delivery_address}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)]">Date</p>
                <p className="text-[var(--color-text-primary)] font-medium">{formatDate(selectedOrder.created_at)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
