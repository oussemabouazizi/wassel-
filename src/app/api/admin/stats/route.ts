import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [profiles, stores, orders, recentOrdersRes] = await Promise.all([
    supabase.from('profiles').select('role'),
    supabase.from('stores').select('id, status'),
    supabase.from('orders').select('total, status'),
    supabase.from('orders')
      .select('id, order_number, status, total, created_at, profiles!orders_customer_id_fkey(full_name), stores(name)')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const totalUsers = profiles.data?.length || 0;
  const totalStores = stores.data?.length || 0;
  const pendingStores = stores.data?.filter(s => s.status === 'pending').length || 0;
  const totalRevenue = orders.data?.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0) || 0;
  const totalOrders = orders.data?.length || 0;

  const roleCount: Record<string, number> = {};
  profiles.data?.forEach(p => { roleCount[p.role] = (roleCount[p.role] || 0) + 1; });
  const usersByRole = Object.entries(roleCount).map(([role, count]) => ({ role, count }));

  const recentOrders = (recentOrdersRes.data || []).map((o: any) => ({
    id: o.id, order_number: o.order_number, status: o.status, total: o.total,
    created_at: o.created_at, profiles: o.profiles, stores: o.stores,
  }));

  let ordersPerDay: { date: string; count: number }[] = [];
  try {
    const { data: ordersByDay } = await supabase.rpc('get_orders_by_day');
    ordersPerDay = (ordersByDay || []) as { date: string; count: number }[];
  } catch {
    const { data: dayData } = await supabase
      .from('orders')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    const dayCount: Record<string, number> = {};
    (dayData || []).forEach(o => {
      const d = new Date(o.created_at).toISOString().split('T')[0];
      dayCount[d] = (dayCount[d] || 0) + 1;
    });
    ordersPerDay = Object.entries(dayCount).map(([date, count]) => ({ date, count }));
  }

  return NextResponse.json({
    totalUsers, totalStores, totalOrders, totalRevenue, pendingStores,
    usersByRole, recentOrders, ordersPerDay,
  });
}
