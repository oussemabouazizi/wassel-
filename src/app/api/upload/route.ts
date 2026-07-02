import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    request.headers.get('Authorization')?.replace('Bearer ', '') || ''
  );
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Create 'uploads' bucket if it doesn't exist
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === 'uploads');

  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket('uploads', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, bucket: 'uploads' });
}

export async function PUT(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Auto-create bucket if it doesn't exist
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === 'uploads');
  if (!bucketExists) {
    await supabase.storage.createBucket('uploads', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const folder = formData.get('folder') as string || 'general';

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(fileName, file, { upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(data.path);

  return NextResponse.json({ url: urlData.publicUrl, path: data.path });
}
