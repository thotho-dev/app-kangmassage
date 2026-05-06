import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'avatars';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Convert File to ArrayBuffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Uploading file: ${file.name} to bucket: ${bucket}`);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Supabase Storage error:', error);
      // If bucket doesn't exist, try to create it (only works if admin client)
      if (error.message.toLowerCase().includes('bucket not found')) {
        console.log(`Bucket ${bucket} not found, creating...`);
        const { error: createError } = await supabase.storage.createBucket(bucket, { public: true });
        if (createError) {
          console.error('Failed to create bucket:', createError);
          return NextResponse.json({ error: createError.message }, { status: 500 });
        }
        
        console.log(`Retrying upload to ${bucket}...`);
        const { data: retryData, error: retryError } = await supabase.storage
          .from(bucket)
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false
          });
        if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
        
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return NextResponse.json({ url: publicUrl });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
