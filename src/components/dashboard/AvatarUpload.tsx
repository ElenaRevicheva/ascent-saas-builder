import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Video, Trash2, Play, Pause } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AvatarUpload = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // 8 Nov 2026 (Elena: "it says uploaded, but the old avatar sits there"): the upload worked, but the file keeps the same
  // address and was cached for an hour, so the browser kept playing its old copy. Every address now carries the file's
  // own version (?v=), the cache is short, and the card says whose video it shows.
  const [ownName, setOwnName] = useState<string | null>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = (file.name.split('.').pop() || 'mp4').toLowerCase();
      const fileName = `${user.id}/avatar.${fileExt}`;
      // One avatar per family: a different format (mov/webm) must not leave the old mp4 shown on the next visit.
      const { data: old } = await supabase.storage.from('avatars').list(user.id);
      const stale = (old ?? []).map((f) => `${user.id}/${f.name}`).filter((n) => /\/avatar\./.test(n) && n !== fileName);

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '60'
        });

      if (uploadError) throw uploadError;
      if (stale.length) await supabase.storage.from('avatars').remove(stale);

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
      setOwnName(fileName);
      toast.success('Avatar video uploaded successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar video');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !avatarUrl || !ownName) return;

    try {
      const { error } = await supabase.storage
        .from('avatars')
        .remove([ownName]);

      if (error) throw error;

      setOwnName(null);
      setAvatarUrl(null);
      toast.success('Avatar video deleted successfully!');
    } catch (error) {
      console.error('Error deleting avatar:', error);
      toast.error('Failed to delete avatar video');
    }
  };

  const togglePlayback = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Check for existing avatar on component mount and show default EspaLuz avatar if needed
  useEffect(() => {
    if (user) {
      // The family's own video, newest first, addressed by its version so a replaced file is never shown stale.
      supabase.storage.from('avatars').list(user.id, { sortBy: { column: 'updated_at', order: 'desc' } })
        .then(({ data: files }) => {
          const own = (files ?? []).find((f) => /^avatar\./.test(f.name));
          if (!own) { setAvatarUrl('/videos/espaluz-avatar.mp4'); return; }
          const name = `${user.id}/${own.name}`;
          const { data } = supabase.storage.from('avatars').getPublicUrl(name);
          setOwnName(name);
          setAvatarUrl(`${data.publicUrl}?v=${encodeURIComponent(own.updated_at ?? own.created_at ?? '')}`);
        }, () => setAvatarUrl('/videos/espaluz-avatar.mp4'));
    }
  }, [user]);

  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          Avatar Video
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!avatarUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload your 30-second avatar MP4 video to use in video generation.
            </p>
            
            <Button
              onClick={handleFileSelect}
              disabled={uploading}
              className="w-full bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
            >
              {uploading ? (
                <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploading ? 'Processing...' : 'Upload Video'}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Supported formats: MP4, WebM, MOV</p>
              <p>• Maximum file size: 50MB</p>
              <p>• Recommended duration: 30 seconds</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <video
                ref={videoRef}
                key={avatarUrl}
                src={avatarUrl}
                className="w-full h-48 object-cover"
                loop
                muted
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={togglePlayback}
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleFileSelect}
                disabled={uploading}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace Video
              </Button>
              
              {ownName && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Only what is true: EspaLuz's talking videos use her own face; nothing reads a family's upload yet. */}
            <p className="text-sm text-muted-foreground">
              {ownName
                ? '✓ Your video is saved. EspaLuz’s talking videos still use her own face.'
                : 'This is EspaLuz. You can upload your own short video here.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};