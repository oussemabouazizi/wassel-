import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const q = searchParams.get('q');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

  if (role && role !== 'all') query = query.eq('role', role);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId } = body;
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  if (userId === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  try {
    const { data: stores } = await supabase.from('stores').select('id').eq('owner_id', userId);
    if (stores && stores.length > 0) {
      const storeIds = stores.map(s => s.id);
      const { data: orderIds } = await supabase.from('orders').select('id').in('store_id', storeIds);
      if (orderIds && orderIds.length > 0) {
        await supabase.from('order_items').delete().in('order_id', orderIds.map(o => o.id));
      }
      await supabase.from('orders').delete().in('store_id', storeIds);
      await supabase.from('products').delete().in('store_id', storeIds);
      await supabase.from('stores').delete().eq('owner_id', userId);
    }
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('delivery_persons').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);

    // Sign out the deleted user from all sessions
    await supabase.auth.admin.signOut(userId);
  } catch (cleanupErr) {
    console.error('Cleanup error:', cleanupErr);
    return NextResponse.json({ error: 'Failed to clean up user data' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
