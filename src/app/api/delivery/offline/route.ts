import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  await supabase.from('delivery_persons')
    .update({ online_status: 'offline' })
    .eq('user_id', userId);

  return NextResponse.json({ success: true });
}
