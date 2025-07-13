-- Create storage buckets for multimedia content
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('audio-files', 'audio-files', true),
  ('generated-videos', 'generated-videos', true),
  ('video-templates', 'video-templates', true);

-- Create RLS policies for audio-files bucket
CREATE POLICY "Public read access for audio files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'audio-files');

CREATE POLICY "Authenticated users can upload audio files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'audio-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own audio files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for generated-videos bucket
CREATE POLICY "Public read access for generated videos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'generated-videos');

CREATE POLICY "Authenticated users can upload generated videos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'generated-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own generated videos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'generated-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own generated videos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'generated-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for video-templates bucket (public read only, admin upload)
CREATE POLICY "Public read access for video templates" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'video-templates');

CREATE POLICY "Authenticated users can upload video templates" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'video-templates' AND auth.role() = 'authenticated');