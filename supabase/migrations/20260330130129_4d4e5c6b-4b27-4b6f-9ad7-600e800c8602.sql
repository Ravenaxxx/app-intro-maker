
-- Create storage bucket for videos (public access)
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

-- Allow anyone to upload files to the videos bucket
CREATE POLICY "Allow public uploads to videos bucket"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'videos');

-- Allow anyone to read files from the videos bucket
CREATE POLICY "Allow public reads from videos bucket"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'videos');

-- Allow anyone to delete files from the videos bucket
CREATE POLICY "Allow public deletes from videos bucket"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'videos');

-- Create a metadata table for video entries
CREATE TABLE public.library_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.library_videos ENABLE ROW LEVEL SECURITY;

-- Public read/write access (no auth)
CREATE POLICY "Allow public select" ON public.library_videos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert" ON public.library_videos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.library_videos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON public.library_videos FOR DELETE TO anon, authenticated USING (true);
