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

  const { latitude, longitude } = await request.json();
  if (!latitude || !longitude) return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });

  const { error } = await supabase
    .from('delivery_persons')
    .update({ latitude, longitude })
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
    .select('id, user_id, latitude, longitude, online_status, total_deliveries, rating, vehicle_type, profiles!delivery_persons_user_id_fkey(full_name, avatar_url)')
    .eq('online_status', 'online')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
