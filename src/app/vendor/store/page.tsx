'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Plus, Edit3, Trash2, Star, MapPin, Clock, Power } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Card, Button, Modal, Input, Textarea, Select, Badge, Toggle, EmptyState, Skeleton } from '@/components/ui';
import { useConfirm, useToast } from '@/components/ui';
import type { Store as StoreType, Category } from '@/types';

export default function StoreManagement() {
  const supabase = createClient();
  const { user } = useAppStore();
  const { toast } = useToast();

  const [stores, setStores] = useState<StoreType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const { confirm } = useConfirm();
  const [form, setForm] = useState({
    name: '', description: '', image_url: '', category_id: '', address: '',
    latitude: '', longitude: '', opening_time: '08:00', closing_time: '22:00',
    delivery_fee: '', estimated_delivery_time: '30', min_order: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    try {
      const [storesRes, catsRes] = await Promise.all([
        supabase.from('stores').select('*').eq('owner_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order'),
      ]);
      setStores(storesRes.data || []);
      setCategories(catsRes.data || []);
    } catch {
      toast('error', 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditingStore(null);
    setForm({ name: '', description: '', image_url: '', category_id: '', address: '', latitude: '', longitude: '', opening_time: '08:00', closing_time: '22:00', delivery_fee: '', estimated_delivery_time: '30', min_order: '' });
    setShowModal(true);
  }

  function openEdit(store: StoreType) {
    setEditingStore(store);
    setForm({
      name: store.name,
      description: store.description,
      image_url: store.image_url,
      category_id: store.category_id,
      address: store.address,
      latitude: String(store.latitude),
      longitude: String(store.longitude),
      opening_time: store.opening_time,
      closing_time: store.closing_time,
      delivery_fee: String(store.delivery_fee),
      estimated_delivery_time: String(store.estimated_delivery_time),
      min_order: String(store.min_order),
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.category_id || !form.address) {
      toast('error', 'Name, category, and address are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        image_url: form.image_url,
        category_id: form.category_id,
        address: form.address,
        latitude: parseFloat(form.latitude) || 0,
        longitude: parseFloat(form.longitude) || 0,
        opening_time: form.opening_time,
        closing_time: form.closing_time,
        delivery_fee: parseFloat(form.delivery_fee) || 0,
        estimated_delivery_time: parseInt(form.estimated_delivery_time) || 30,
        min_order: parseFloat(form.min_order) || 0,
      };

      if (editingStore) {
        const { error } = await supabase.from('stores').update(payload).eq('id', editingStore.id);
        if (error) throw error;
        toast('success', 'Store updated');
      } else {
        const { error } = await supabase.from('stores').insert({ ...payload, owner_id: user!.id });
        if (error) throw error;
        toast('success', 'Store created');
      }
      setShowModal(false);
      loadData();
    } catch {
      toast('error', 'Failed to save store');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({ title: 'Delete Store', message: 'Are you sure you want to delete this store? This action cannot be undone.', confirmText: 'Delete', variant: 'danger' });
    if (!confirmed) return;
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (error) {
      toast('error', 'Failed to delete store');
    } else {
      setStores(prev => prev.filter(s => s.id !== id));
      toast('success', 'Store deleted');
    }
  }

  async function toggleOpen(store: StoreType) {
    const { error } = await supabase.from('stores').update({ is_open: !store.is_open }).eq('id', store.id);
    if (error) {
      toast('error', 'Failed to toggle store status');
    } else {
      setStores(prev => prev.map(s => s.id === store.id ? { ...s, is_open: !s.is_open } : s));
      toast('success', `${store.name} ${!store.is_open ? 'opened' : 'closed'}`);
    }
  }

  if (loading) return <StoreSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">My Stores</h1>
          <p className="text-[var(--color-text-secondary)]">Manage your stores and their availability</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          Add Store
        </Button>
      </div>

      {stores.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Store className="w-8 h-8 text-[var(--color-text-secondary)]" />}
            title="No stores yet"
            description="Create your first store to start selling on Wassel"
            action={<Button onClick={openAdd}>Create Store</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stores.map((store, i) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card hover>
                <div className="relative h-32 -mx-4 -mt-4 mb-4 rounded-t-2xl overflow-hidden bg-gradient-to-br from-orange-500/20 to-orange-600/20">
                  {store.cover_url && (
                    <img src={store.cover_url} alt="" className="w-full h-full object-cover" />
                  )}
                  {store.image_url && (
                    <div className="absolute -bottom-6 left-4 w-14 h-14 rounded-xl overflow-hidden border-2 border-[var(--color-background)] shadow-md">
                      <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge variant={store.status === 'approved' ? 'success' : 'warning'}>
                      {store.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{store.name}</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1">{store.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)] mb-3">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-500" />
                    {store.rating.toFixed(1)} ({store.total_reviews})
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {store.opening_time} - {store.closing_time}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mb-4">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{store.address}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                  <Toggle
                    checked={store.is_open}
                    onChange={() => toggleOpen(store)}
                    label={store.is_open ? 'Open' : 'Closed'}
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(store)}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(store.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingStore ? 'Edit Store' : 'Add New Store'}
        size="xl"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Store Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            <Select
              label="Category"
              value={form.category_id}
              onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select category"
            />
          </div>
          <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
          <Input label="Image URL" value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} />
          <Input label="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Latitude" type="number" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} />
            <Input label="Longitude" type="number" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Opening Time" type="time" value={form.opening_time} onChange={e => setForm(p => ({ ...p, opening_time: e.target.value }))} />
            <Input label="Closing Time" type="time" value={form.closing_time} onChange={e => setForm(p => ({ ...p, closing_time: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Delivery Fee (TND)" type="number" value={form.delivery_fee} onChange={e => setForm(p => ({ ...p, delivery_fee: e.target.value }))} />
            <Input label="Est. Delivery (min)" type="number" value={form.estimated_delivery_time} onChange={e => setForm(p => ({ ...p, estimated_delivery_time: e.target.value }))} />
            <Input label="Min Order (TND)" type="number" value={form.min_order} onChange={e => setForm(p => ({ ...p, min_order: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[var(--color-border)]">
          <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} isLoading={saving}>
            {editingStore ? 'Update Store' : 'Create Store'}
          </Button>
        </div>
      </Modal>

    </div>
  );
}

function StoreSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-32 w-full -mx-4 -mt-4 mb-4 rounded-t-2xl" />
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-4 w-48 mb-4" />
            <Skeleton className="h-8 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
