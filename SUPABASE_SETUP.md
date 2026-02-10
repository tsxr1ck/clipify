# Supabase Storage Setup Guide

This guide will help you set up Supabase storage buckets for Clipify to save generated images and videos.

## Required Buckets

You need to create the following buckets in your Supabase project:

### 1. **images** bucket
- **Purpose**: Store generated images
- **Public**: Yes (public access)
- **File size limit**: 10 MB
- **Allowed MIME types**: image/png, image/jpeg, image/webp

### 2. **videos** bucket
- **Purpose**: Store generated videos
- **Public**: Yes (public access)
- **File size limit**: 100 MB
- **Allowed MIME types**: video/mp4, video/webm

### 3. **characters** bucket
- **Purpose**: Store character reference images
- **Public**: Yes (public access)
- **File size limit**: 10 MB
- **Allowed MIME types**: image/png, image/jpeg

### 4. **styles** bucket
- **Purpose**: Store style reference images
- **Public**: Yes (public access)
- **File size limit**: 10 MB
- **Allowed MIME types**: image/png, image/jpeg

### 5. **generations** bucket
- **Purpose**: General purpose bucket for other generated content
- **Public**: Yes (public access)
- **File size limit**: 100 MB

## Setup Steps

### 1. Create Buckets in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket** for each bucket listed above
4. Configure each bucket with the settings specified

### 2. Set Bucket Policies

For each bucket, you need to set up the following policies:

#### Public Read Policy
Allow anyone to read files from the bucket:

```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' ); -- Replace 'images' with each bucket name
```

#### Authenticated Upload Policy
Allow authenticated users to upload files:

```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' AND -- Replace 'images' with each bucket name
  auth.role() = 'authenticated'
);
```

#### Owner Delete Policy
Allow users to delete their own files:

```sql
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'images' AND -- Replace 'images' with each bucket name
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. Configure Environment Variables

Make sure your `.env` file has the correct Supabase credentials:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key"
```

**Note**: Use the **service role key**, not the anon key, as the backend needs admin privileges to upload files.

## File Organization

Files are automatically organized by user:

```
images/
  ├── user-id-1/
  │   ├── generation-id-1.png
  │   └── generation-id-2.png
  └── user-id-2/
      └── generation-id-3.png

videos/
  ├── user-id-1/
  │   └── generation-id-1.mp4
  └── user-id-2/
      └── generation-id-2.mp4
```

## Verifying Setup

After generating content, you can verify it's being saved by:

1. Check the Supabase Storage dashboard
2. Look for files in the respective buckets
3. Check that the `outputUrl` in the database points to Supabase

## Troubleshooting

### "Upload failed" errors
- Verify bucket names match exactly (case-sensitive)
- Check that policies are set up correctly
- Ensure service role key has proper permissions

### Files not appearing
- Check browser console for errors
- Verify backend logs for upload attempts
- Ensure database has correct Supabase URL in `outputUrl`

### Large file uploads failing
- Videos can be large - ensure your bucket size limits are adequate
- Consider increasing timeout values if needed
- Check network connectivity

## Cost Considerations

Supabase Storage pricing (as of 2024):
- **Free tier**: 1 GB storage, 2 GB bandwidth/month
- **Pro tier**: 8 GB storage, 50 GB bandwidth/month
- **Additional**: $0.021/GB storage, $0.09/GB bandwidth

Monitor your usage in the Supabase dashboard to avoid unexpected costs.
