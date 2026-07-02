'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Edit3, Trash2, Search, Filter, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Card, Button, Modal, Input, Textarea, Select, Toggle, Badge, EmptyState, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import type { Store as StoreType, Product, Category } from '@/types';

export default function ProductManagement() {
  const supabase = createClient();
  const { user } = useAppStore();
  const { toast } = useToast();

  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', price: '', image_url: '', stock: '', category_id: '', preparation_time: '15',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) loadStores();
  }, [user]);

  async function loadStores() {
    try {
      const { data } = await supabase.from('stores').select('*').eq('owner_id', user!.id);
      const storeList = data || [];
      setStores(storeList);
      if (storeList.length > 0) {
        setSelectedStoreId(storeList[0].id);
      }
    } catch {
      toast('error', 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedStoreId) {
      loadProducts();
      loadCategories();
    }
  }, [selectedStoreId]);

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').eq('store_id', selectedStoreId).order('created_at', { ascending: false });
    setProducts(data || []);
  }

  async function loadCategories() {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order');
    if (error) {
      console.error('Failed to load categories:', error);
      toast('error', 'Failed to load categories: ' + error.message);
    }
    setCategories(data || []);
  }

  function openAdd() {
    setEditingProduct(null);
    setForm({ name: '', description: '', price: '', image_url: '', stock: '0', category_id: '', preparation_time: '15' });
    setShowModal(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      image_url: product.image_url,
      stock: String(product.stock),
      category_id: product.category_id,
      preparation_time: String(product.preparation_time),
    });
    setShowModal(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('error', 'File must be under 5MB'); return; }
    if (!file.type.startsWith('image/')) { toast('error', 'File must be an image'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'products');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/upload', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(p => ({ ...p, image_url: data.url }));
      toast('success', 'Image uploaded');
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!form.name || !form.price || !form.category_id) {
      toast('error', 'Name, price, and category are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        image_url: form.image_url,
        stock: parseInt(form.stock) || 0,
        category_id: form.category_id,
        preparation_time: parseInt(form.preparation_time) || 15,
      };

      if (editingProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
        toast('success', 'Product updated');
      } else {
        const { error } = await supabase.from('products').insert({ ...payload, store_id: selectedStoreId });
        if (error) throw error;
        toast('success', 'Product created');
      }
      setShowModal(false);
      loadProducts();
    } catch {
      toast('error', 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast('error', 'Failed to delete product');
    } else {
      setProducts(prev => prev.filter(p => p.id !== id));
      toast('success', 'Product deleted');
    }
  }

  async function toggleAvailability(product: Product) {
    const { error } = await supabase.from('products').update({ is_available: !product.is_available }).eq('id', product.id);
    if (error) {
      toast('error', 'Failed to update product');
    } else {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: !p.is_available } : p));
    }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <ProductSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Products</h1>
          <p className="text-[var(--color-text-secondary)]">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-3">
          {stores.length > 1 && (
            <Select
              value={selectedStoreId}
              onChange={e => setSelectedStoreId(e.target.value)}
              options={stores.map(s => ({ value: s.id, label: s.name }))}
              className="w-48"
            />
          )}
          <Button onClick={openAdd} disabled={!selectedStoreId}>
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {!selectedStoreId ? (
        <Card>
          <EmptyState
            icon={<Package className="w-8 h-8 text-[var(--color-text-secondary)]" />}
            title="No store selected"
            description="Create a store first to manage products"
          />
        </Card>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Package className="w-8 h-8" />}
                title={search ? 'No products match your search' : 'No products yet'}
                description={search ? 'Try a different search term' : 'Add your first product'}
                action={!search ? <Button onClick={openAdd}>Add Product</Button> : undefined}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card hover>
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-8 h-8 m-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-[var(--color-text-primary)] truncate">{product.name}</h3>
                          <Badge variant={product.is_available ? 'success' : 'danger'} size="sm">
                            {product.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </div>
                        <p className="text-lg font-bold text-[var(--color-primary)] mt-1">{formatPrice(product.price)}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-secondary)]">
                          <span>Stock: {product.stock}</span>
                          <span>Prep: {product.preparation_time}min</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-border)]">
                      <Toggle
                        checked={product.is_available}
                        onChange={() => toggleAvailability(product)}
                      />
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2 line-clamp-2">{product.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        size="lg"
      >
        <div className="space-y-4">
          <Input label="Product Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (TND)" type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required />
            <Input label="Stock" type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} />
          </div>
          <Select
            label="Category"
            value={form.category_id}
            onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            placeholder="Select category"
          />
          <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Product Image</label>
            {form.image_url ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[var(--color-border)]">
                <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-32 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] flex flex-col items-center justify-center gap-2 transition-colors"
              >
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-[var(--color-text-secondary)]" />
                    <span className="text-sm text-[var(--color-text-secondary)]">Click to upload image</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">PNG, JPG, WebP up to 5MB</span>
                  </>
                )}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileUpload} className="hidden" />
            <Input
              label="Or paste image URL"
              value={form.image_url}
              onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
              placeholder="https://..."
              className="mt-2"
            />
          </div>

          <Input label="Preparation Time (min)" type="number" value={form.preparation_time} onChange={e => setForm(p => ({ ...p, preparation_time: e.target.value }))} />
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[var(--color-border)]">
          <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} isLoading={saving}>
            {editingProduct ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <div className="flex gap-4">
              <Skeleton className="w-20 h-20 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-6 w-20 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
