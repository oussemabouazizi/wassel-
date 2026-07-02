import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const [profilesRes, storesRes, ordersRes, reviewsRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('reviews').select('rating'),
  ]);

  const avgRating = reviewsRes.data && reviewsRes.data.length > 0
    ? reviewsRes.data.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewsRes.data.length
    : 0;

  return NextResponse.json({
    users: profilesRes.count || 0,
    stores: storesRes.count || 0,
    orders: ordersRes.count || 0,
    rating: Math.round(avgRating * 10) / 10,
  });
}
