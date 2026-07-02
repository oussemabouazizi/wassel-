'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Bike, Star, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Button, Input, Badge, Avatar, Card, Skeleton, EmptyState, useToast, useConfirm } from '@/components/ui';
import type { DeliveryPerson, DeliveryPersonStatus, OnlineStatus } from '@/types';

interface DeliveryWithProfile extends DeliveryPerson {
  profiles: { full_name: string; email: string; phone: string; avatar_url: string | null };
}

const statusBadge: Record<DeliveryPersonStatus, 'warning' | 'success' | 'danger' | 'gray'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  suspended: 'gray',
};

const onlineBadge: Record<OnlineStatus, 'success' | 'gray' | 'warning'> = {
  online: 'success',
  offline: 'gray',
  busy: 'warning',
};

export default function AdminDeliveries() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [deliveries, setDeliveries] = useState<DeliveryWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data: persons, error: err } = await supabase
        .from('delivery_persons')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;

      const userIds = (persons || []).map((p: any) => p.user_id);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, email, phone, avatar_url').in('id', userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const merged = (persons || []).map((p: any) => ({
        ...p,
        profiles: profileMap.get(p.user_id) || { full_name: 'Unknown', email: '', phone: '', avatar_url: null },
      }));

      let filtered = merged as unknown as DeliveryWithProfile[];
      if (search) {
        filtered = filtered.filter(d => d.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()));
      }

      setDeliveries(filtered);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 10000);
    return () => clearInterval(interval);
  }, [fetchDeliveries]);

  async function updateStatus(personId: string, status: DeliveryPersonStatus) {
    const shouldProceed = await confirm({
      title: `${status.charAt(0).toUpperCase() + status.slice(1)} Delivery Person`,
      message: `Are you sure you want to ${status} this delivery person?`,
      confirmText: status === 'rejected' ? 'Reject' : status === 'approved' ? 'Approve' : 'Suspend',
      variant: status === 'rejected' || status === 'suspended' ? 'danger' : 'primary',
    });
    if (!shouldProceed) return;

    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from('delivery_persons')
        .update({ status })
        .eq('id', personId);
      if (err) throw err;
      setDeliveries((prev) => prev.map((d) => (d.id === personId ? { ...d, status } : d)));
      toast('success', `Delivery person ${status} successfully`);
    } catch (err: any) {
      toast('error', err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Delivery Persons</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Manage delivery personnel</p>
      </div>

      <Input
        icon={<Search className="w-4 h-4" />}
        placeholder="Search by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="w-12 h-12 text-[var(--color-error)] mb-4" />
          <p className="text-[var(--color-error)] font-medium">{error}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon={<Bike className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No delivery persons"
          description={search ? 'Try a different search term' : 'No delivery persons have registered yet'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deliveries.map((person, i) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card>
                <div className="flex items-start gap-4">
                  <Avatar
                    name={person.profiles?.full_name || 'Delivery'}
                    src={person.profiles?.avatar_url}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-[var(--color-text-primary)]">
                          {person.profiles?.full_name || 'Unknown'}
                        </h3>
                        <p className="text-xs text-[var(--color-text-secondary)]">{person.profiles?.email}</p>
                      </div>
                      <Badge variant={statusBadge[person.status]}>{person.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                      <div>
                        <p className="text-[var(--color-text-secondary)] text-xs">Vehicle</p>
                        <p className="text-[var(--color-text-primary)] font-medium capitalize">{person.vehicle_type}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-text-secondary)] text-xs">Status</p>
                        <Badge variant={onlineBadge[person.online_status]}>
                          {person.online_status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[var(--color-text-secondary)] text-xs">Deliveries</p>
                        <p className="text-[var(--color-text-primary)] font-medium">{person.total_deliveries}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-text-secondary)] text-xs">Rating</p>
                        <p className="text-[var(--color-text-primary)] font-medium flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          {person.rating.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                  {person.status === 'pending' && (
                    <>
                      <Button size="sm" variant="primary" onClick={() => updateStatus(person.id, 'approved')}>
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => updateStatus(person.id, 'rejected')}>
                        <XCircle className="w-4 h-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  {person.status === 'approved' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(person.id, 'suspended')}>
                      Suspend
                    </Button>
                  )}
                  {person.status === 'suspended' && (
                    <Button size="sm" variant="primary" onClick={() => updateStatus(person.id, 'approved')}>
                      <CheckCircle className="w-4 h-4" />
                      Reactivate
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
