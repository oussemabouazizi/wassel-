'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Tags, Plus, Edit3, Trash2, AlertTriangle, Upload, X, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Textarea, Badge, Modal, Card, Toggle, Skeleton, EmptyState, useToast, useConfirm } from '@/components/ui';
import type { Category } from '@/types';

interface CategoryForm {
  name: string;
  name_ar: string;
  name_fr: string;
  icon: string;
  image_url: string;
  sort_order: number;
}

const defaultForm: CategoryForm = {
  name: '',
  name_ar: '',
  name_fr: '',
  icon: 'Tag',
  image_url: '',
  sort_order: 0,
};

export default function AdminCategories() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (err) throw err;
      setCategories(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreate() {
    setEditingCategory(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEdit(category: Category) {
    setEditingCategory(category);
    setForm({
      name: category.name,
      name_ar: category.name_ar,
      name_fr: category.name_fr,
      icon: category.icon,
      image_url: category.image_url,
      sort_order: category.sort_order,
    });
    setShowModal(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'File must be under 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast('error', 'File must be an image');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'categories');

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/upload', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setForm(prev => ({ ...prev, image_url: data.url }));
      toast('success', 'Image uploaded');
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast('error', 'Category name is required');
      return;
    }
    try {
      setSaving(true);
      const supabase = createClient();

      if (editingCategory) {
        const { error: err } = await supabase
          .from('categories')
          .update(form)
          .eq('id', editingCategory.id);
        if (err) throw err;
        toast('success', 'Category updated');
      } else {
        const { error: err } = await supabase
          .from('categories')
          .insert(form);
        if (err) throw err;
        toast('success', 'Category created');
      }

      setShowModal(false);
      fetchCategories();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    const shouldDelete = await confirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    try {
      const supabase = createClient();
      const { error: err } = await supabase.from('categories').delete().eq('id', category.id);
      if (err) throw err;
      toast('success', 'Category deleted');
      fetchCategories();
    } catch (err: any) {
      toast('error', err.message);
    }
  }

  async function toggleActive(category: Category) {
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from('categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);
      if (err) throw err;
      setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, is_active: !c.is_active } : c)));
      toast('success', `Category ${category.is_active ? 'deactivated' : 'activated'}`);
    } catch (err: any) {
      toast('error', err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Categories</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Manage store categories</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="w-12 h-12 text-[var(--color-error)] mb-4" />
          <p className="text-[var(--color-error)] font-medium">{error}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Tags className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No categories"
          description="Create your first category to organize stores"
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Category</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category, i) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-2xl">
                        {category.icon}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-[var(--color-text-primary)]">{category.name}</h3>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {category.name_ar} / {category.name_fr}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">Order: {category.sort_order}</p>
                    </div>
                  </div>
                  <Toggle
                    checked={category.is_active}
                    onChange={() => toggleActive(category)}
                  />
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                  <Button size="sm" variant="outline" onClick={() => openEdit(category)}>
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(category)}>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
      >
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Name (Arabic)" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
          <Input label="Name (French)" value={form.name_fr} onChange={(e) => setForm({ ...form, name_fr: e.target.value })} />
          <Input label="Icon (emoji)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🍕" />

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Category Image</label>
            {form.image_url ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[var(--color-border)]">
                <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Input
              label="Or paste image URL"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
              className="mt-2"
            />
          </div>

          <Input label="Sort Order" type="number" value={form.sort_order.toString()} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
