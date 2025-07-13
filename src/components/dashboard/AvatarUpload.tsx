import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Video, Trash2, Play, Pause, Copy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { copyAvatarToCurrentUser } from '@/utils/copyAvatar';
import { callCopyAvatar } from '@/utils/callCopyAvatar';

export const AvatarUpload = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(data.publicUrl);
      toast.success('Avatar video uploaded successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar video');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !avatarUrl) return;

    try {
      const fileName = `${user.id}/avatar.mp4`;
      
      const { error } = await supabase.storage
        .from('avatars')
        .remove([fileName]);

      if (error) throw error;

      setAvatarUrl(null);
      toast.success('Avatar video deleted successfully!');
    } catch (error) {
      console.error('Error deleting avatar:', error);
      toast.error('Failed to delete avatar video');
    }
  };

  const handleCopyAvatar = async () => {
    if (!user) return;
    
    setUploading(true);
    try {
      const result = await callCopyAvatar();
      console.log('Copy result:', result);
      
      // Refresh the avatar URL
      const fileName = `${user.id}/avatar.mp4`;
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      setAvatarUrl(data.publicUrl);
      toast.success('Avatar video copied successfully!');
    } catch (error) {
      console.error('Error copying avatar:', error);
      toast.error('Failed to copy avatar video');
    } finally {
      setUploading(false);
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

  // Check for existing avatar on component mount and auto-copy if needed
  useEffect(() => {
    if (user) {
      const fileName = `${user.id}/avatar.mp4`;
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Check if file exists by trying to fetch it
      fetch(data.publicUrl, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            setAvatarUrl(data.publicUrl);
          } else {
            // File doesn't exist, try to copy from the old location
            console.log('Avatar not found, attempting to copy from old location...');
            handleCopyAvatar();
          }
        })
        .catch(() => {
          // File doesn't exist, try to copy from the old location
          console.log('Avatar not found, attempting to copy from old location...');
          handleCopyAvatar();
        });
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
            
            <div className="flex gap-2">
              <Button
                onClick={handleFileSelect}
                disabled={uploading}
                className="flex-1 bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
              >
                {uploading ? (
                  <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? 'Processing...' : 'Upload Video'}
              </Button>
              
              <Button
                onClick={handleCopyAvatar}
                disabled={uploading}
                variant="outline"
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Avatar
              </Button>
            </div>
            
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
              
              <Button
                variant="outline"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-sm text-green-600">
              ✓ Avatar video ready! This will be used in video generation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};