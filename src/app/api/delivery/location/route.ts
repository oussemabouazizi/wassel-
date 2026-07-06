import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { latitude, longitude, online_status } = body;

  const update: Record<string, any> = {};

  if (online_status === 'offline') {
    // Clear location when going offline
    update.latitude = 0;
    update.longitude = 0;
    update.online_status = 'offline';
  } else if (latitude !== undefined && longitude !== undefined) {
    update.latitude = latitude;
    update.longitude = longitude;
    update.online_status = 'online';
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid data' }, { status: 400 });
  }

  const { error } = await supabase
    .from('delivery_persons')
    .update(update)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from('delivery_persons')
    .select('id, user_id, latitude, longitude, online_status, total_deliveries, rating, vehicle_type');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = (data || []).map((d: any) => d.user_id).filter(Boolean);
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
  const merged = (data || []).map((d: any) => ({
    ...d,
    profiles: profileMap.get(d.user_id) || { full_name: 'Delivery', avatar_url: null },
  }));

  return NextResponse.json({ data: merged });
}
