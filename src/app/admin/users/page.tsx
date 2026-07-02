'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, UsersRound, UserX, UserCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Button, Input, Select, Badge, Avatar, Modal, Card, Toggle, Skeleton, EmptyState, useToast, useConfirm } from '@/components/ui';
import type { Profile, UserRole } from '@/types';

export default function AdminUsers() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (search) params.set('q', search);

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setUsers(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function toggleActive(userId: string, current: boolean) {
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from('profiles')
        .update({ is_active: !current, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (err) throw err;
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !current } : u)));
      if (selectedUser?.id === userId) setSelectedUser((prev) => prev ? { ...prev, is_active: !current } : null);
      toast('success', `User ${current ? 'suspended' : 'activated'} successfully`);
    } catch (err: any) {
      toast('error', err.message);
    }
  }

  async function deleteUser(userId: string, userName: string) {
    const shouldProceed = await confirm({
      title: 'Delete User',
      message: `Are you sure you want to permanently delete "${userName}"? This cannot be undone.`,
      confirmText: 'Yes, delete permanently',
      variant: 'danger',
    });
    if (!shouldProceed) return;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (selectedUser?.id === userId) setSelectedUser(null);
      toast('success', 'User deleted permanently');
    } catch (err: any) {
      toast('error', err.message);
    }
  }

  const roleBadge: Record<UserRole, 'primary' | 'success' | 'info' | 'gray'> = {
    customer: 'gray',
    vendor: 'primary',
    delivery: 'info',
    admin: 'success',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Users</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Manage all platform users</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Roles' },
            { value: 'customer', label: 'Customers' },
            { value: 'vendor', label: 'Vendors' },
            { value: 'delivery', label: 'Delivery' },
            { value: 'admin', label: 'Admins' },
          ]}
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
      ) : users.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No users found"
          description={search ? 'Try a different search term' : 'No users have registered yet'}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-medium">User</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-medium hidden md:table-cell">Email</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-medium hidden sm:table-cell">Phone</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-medium">Role</th>
                  <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-[var(--color-text-secondary)] font-medium hidden lg:table-cell">Joined</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.full_name} src={user.avatar_url} size="sm" />
                        <span className="font-medium text-[var(--color-text-primary)]">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)] hidden md:table-cell">{user.email}</td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)] hidden sm:table-cell">{user.phone || '---'}</td>
                    <td className="py-3 px-4">
                      <Badge variant={roleBadge[user.role]}>{user.role}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className={user.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {user.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)] text-xs hidden lg:table-cell text-right">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant={user.is_active ? 'ghost' : 'outline'}
                          onClick={(e) => { e.stopPropagation(); toggleActive(user.id, user.is_active); }}
                        >
                          {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); deleteUser(user.id, user.full_name); }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Details" size="lg">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={selectedUser.full_name} src={selectedUser.avatar_url} size="xl" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{selectedUser.full_name}</h3>
                <Badge variant={roleBadge[selectedUser.role]}>{selectedUser.role}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--color-text-secondary)]">Email</p>
                <p className="text-[var(--color-text-primary)] font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)]">Phone</p>
                <p className="text-[var(--color-text-primary)] font-medium">{selectedUser.phone || '---'}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)]">Language</p>
                <p className="text-[var(--color-text-primary)] font-medium capitalize">{selectedUser.language}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)]">Joined</p>
                <p className="text-[var(--color-text-primary)] font-medium">{formatDate(selectedUser.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Account Status</p>
                <Toggle
                  checked={selectedUser.is_active}
                  onChange={() => toggleActive(selectedUser.id, selectedUser.is_active)}
                  label={selectedUser.is_active ? 'Active' : 'Suspended'}
                />
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={() => { deleteUser(selectedUser.id, selectedUser.full_name); }}
              >
                <Trash2 className="w-4 h-4" />
                Delete User
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
