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

  const { data: persons, error: err } = await supabase
    .from('delivery_persons')
    .select('*')
    .order('created_at', { ascending: false });

  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const userIds = (persons || []).map((p: any) => p.user_id);
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, email, phone, avatar_url').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
  const merged = (persons || []).map((p: any) => ({
    ...p,
    profiles: profileMap.get(p.user_id) || { full_name: 'Unknown', email: '', phone: '', avatar_url: null },
  }));

  return NextResponse.json({ data: merged });
}
