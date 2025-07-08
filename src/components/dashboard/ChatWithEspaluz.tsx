import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Bot, User, Heart, Volume2, Play, Video, Pause } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import avatarImage from '@/assets/avatar-teacher.jpg';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  videoScript?: string;
  familyMember?: string;
  emotion?: string;
  confidence?: number;
  timestamp: Date;
  audioUrl?: string;
  videoUrl?: string;
}

export const ChatWithEspaluz = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState<{[key: string]: 'voice' | 'video' | null}>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<{[key: string]: HTMLAudioElement}>({});
  const videoRefs = useRef<{[key: string]: HTMLVideoElement}>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  const loadChatHistory = async () => {
    try {
      const { data } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('session_type', 'dashboard_chat')
        .order('created_at', { ascending: true })
        .limit(20);

      if (data) {
        const chatMessages: ChatMessage[] = [];
        data.forEach(session => {
          const content = session.content as any;
          const progressData = session.progress_data as any;
          
          // Add user message
          if (content.user_message) {
            chatMessages.push({
              id: `${session.id}-user`,
              role: 'user',
              content: content.user_message,
              timestamp: new Date(session.created_at)
            });
          }
          
          // Add AI response
          if (content.ai_response) {
            chatMessages.push({
              id: `${session.id}-ai`,
              role: 'assistant',
              content: content.ai_response,
              videoScript: content.video_script,
              familyMember: content.family_member,
              emotion: progressData?.emotion,
              confidence: progressData?.confidence,
              timestamp: new Date(session.created_at)
            });
          }
        });
        
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('espaluz-chat', {
        body: {
          message: userMessage.content,
          userId: user.id
        }
      });

      if (error) throw error;

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        videoScript: data.videoScript,
        familyMember: data.familyMember,
        emotion: data.emotion,
        confidence: data.confidence,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Show emotion detection if confidence is high
      if (data.confidence > 0.6) {
        toast.success(`${t('chat.emotionDetected')}: ${data.emotion} (${Math.round(data.confidence * 100)}%)`);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('chat.errorSending'));
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Lo siento, hubo un error. Sorry, there was an error. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const generateVoice = async (messageId: string, text: string) => {
    if (loadingMedia[messageId] === 'voice') return;
    
    setLoadingMedia(prev => ({ ...prev, [messageId]: 'voice' }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-voice', {
        body: { text }
      });

      if (error) throw error;

      // Create audio URL from base64
      const audioBlob = new Blob([
        new Uint8Array(atob(data.audioContent).split('').map(c => c.charCodeAt(0)))
      ], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Update message with audio URL
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, audioUrl } : msg
      ));

      toast.success('Voice generated successfully!');
    } catch (error) {
      console.error('Error generating voice:', error);
      toast.error('Failed to generate voice');
    } finally {
      setLoadingMedia(prev => ({ ...prev, [messageId]: null }));
    }
  };

  const generateVideo = async (messageId: string, videoScript: string) => {
    if (loadingMedia[messageId] === 'video') return;
    
    setLoadingMedia(prev => ({ ...prev, [messageId]: 'video' }));
    
    try {
      console.log('Calling generate-video with script:', videoScript);
      
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { 
          videoScript,
          userId: user?.id 
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from video generation');
      }

      if (data.error) {
        console.error('Edge function returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('Video generation successful:', data);

      // Create audio blob from base64
      const audioBlob = new Blob([
        new Uint8Array(atob(data.audioContent).split('').map(c => c.charCodeAt(0)))
      ], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Check if user has uploaded their own avatar video
      if (data.userAvatarUrl) {
        // User has their own avatar video - use it directly
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { 
            ...msg, 
            videoUrl: data.userAvatarUrl, 
            audioUrl 
          } : msg
        ));
      } else {
        // Fallback to static image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 400;
        canvas.height = 400;
        
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((videoBlob) => {
            if (videoBlob) {
              const staticVideoUrl = URL.createObjectURL(videoBlob);
              setMessages(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, videoUrl: staticVideoUrl, audioUrl } : msg
              ));
            }
          }, 'image/png');
        };
        img.src = avatarImage;
      }

      toast.success('Video generated successfully!');
    } catch (error) {
      console.error('Error generating video:', error);
      toast.error(`Failed to generate video: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingMedia(prev => ({ ...prev, [messageId]: null }));
    }
  };

  const playAudio = (messageId: string, audioUrl: string) => {
    // Stop any currently playing audio
    if (playingAudio && audioRefs.current[playingAudio]) {
      audioRefs.current[playingAudio].pause();
    }

    if (playingAudio === messageId) {
      setPlayingAudio(null);
      return;
    }

    if (!audioRefs.current[messageId]) {
      audioRefs.current[messageId] = new Audio(audioUrl);
      audioRefs.current[messageId].onended = () => setPlayingAudio(null);
    }

    audioRefs.current[messageId].play();
    setPlayingAudio(messageId);
  };

  const playVideo = (messageId: string) => {
    if (playingVideo === messageId) {
      setPlayingVideo(null);
      if (videoRefs.current[messageId]) {
        videoRefs.current[messageId].pause();
      }
    } else {
      setPlayingVideo(messageId);
      if (videoRefs.current[messageId]) {
        videoRefs.current[messageId].play();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getEmotionIcon = (emotion?: string) => {
    switch (emotion) {
      case 'happy': return '😊';
      case 'sad': return '😢';
      case 'confused': return '😕';
      case 'frustrated': return '😤';
      case 'curious': return '🤔';
      default: return '💭';
    }
  };

  const getFamilyMemberBadge = (familyMember?: string) => {
    const memberInfo = {
      alisa: { label: 'Alisa (4yo)', color: 'bg-pink-500' },
      marina: { label: 'Marina (65yo)', color: 'bg-purple-500' },
      elena: { label: 'Elena (39yo)', color: 'bg-blue-500' }
    };
    
    const member = memberInfo[familyMember as keyof typeof memberInfo];
    if (!member) return null;
    
    return (
      <Badge variant="outline" className={`text-xs ${member.color} text-white border-0`}>
        {member.label}
      </Badge>
    );
  };

  return (
    <Card className="border-border/50 shadow-magical h-96" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          {t('chat.title')}
          <Heart className="h-4 w-4 text-[hsl(var(--espaluz-secondary))]" />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 h-full flex flex-col">
        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-3 text-[hsl(var(--espaluz-primary))]" />
                <p>{t('chat.welcome')}</p>
                <p className="text-sm mt-1">{t('chat.startConversation')}</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--espaluz-primary))] flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}>
                  <div
                    className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-[hsl(var(--espaluz-primary))] text-white'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {/* AI Message Metadata and Controls */}
                  {message.role === 'assistant' && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {message.emotion && (
                          <span className="flex items-center gap-1">
                            {getEmotionIcon(message.emotion)}
                            {message.emotion}
                          </span>
                        )}
                        {getFamilyMemberBadge(message.familyMember)}
                        {message.videoScript && (
                          <Badge variant="outline" className="text-xs">
                            <Volume2 className="h-3 w-3 mr-1" />
                            Video Available
                          </Badge>
                        )}
                      </div>
                      
                      {/* Media Controls */}
                      <div className="flex items-center gap-2">
                        {/* Voice Generation Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateVoice(message.id, message.content)}
                          disabled={loadingMedia[message.id] === 'voice'}
                          className="h-7 px-2 text-xs"
                        >
                          {loadingMedia[message.id] === 'voice' ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                          ) : (
                            <Volume2 className="h-3 w-3 mr-1" />
                          )}
                          Voice
                        </Button>

                        {/* Audio Player */}
                        {message.audioUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => playAudio(message.id, message.audioUrl!)}
                            className="h-7 px-2 text-xs"
                          >
                            {playingAudio === message.id ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                        )}

                        {/* Video Generation Button */}
                        {message.videoScript && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateVideo(message.id, message.videoScript!)}
                            disabled={loadingMedia[message.id] === 'video'}
                            className="h-7 px-2 text-xs"
                          >
                            {loadingMedia[message.id] === 'video' ? (
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                            ) : (
                              <Video className="h-3 w-3 mr-1" />
                            )}
                            Video
                          </Button>
                        )}

                        {/* Video Player */}
                        {message.videoUrl && message.audioUrl && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => playVideo(message.id)}
                              className="h-7 px-2 text-xs"
                            >
                              {playingVideo === message.id ? (
                                <Pause className="h-3 w-3" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Video Display */}
                      {message.videoUrl && message.audioUrl && (
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted">
                          {message.videoUrl.includes('.mp4') || message.videoUrl.includes('video') ? (
                            <video
                              ref={el => {
                                if (el) {
                                  videoRefs.current[message.id] = el as any;
                                  // Create audio element and sync with video
                                  const audio = new Audio(message.audioUrl);
                                  el.addEventListener('play', () => {
                                    audio.currentTime = 0;
                                    audio.play();
                                  });
                                  el.addEventListener('pause', () => audio.pause());
                                  el.addEventListener('ended', () => {
                                    audio.pause();
                                    setPlayingVideo(null);
                                  });
                                }
                              }}
                              src={message.videoUrl}
                              className="w-full h-full object-cover"
                              loop
                              muted
                              onEnded={() => setPlayingVideo(null)}
                            />
                          ) : (
                            <img 
                              src={message.videoUrl.startsWith('blob:') ? message.videoUrl : avatarImage} 
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {message.role === 'user' && (
                  <div className="flex-shrink-0 order-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--espaluz-primary))] flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white animate-pulse" />
                  </div>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chat.placeholder')}
            className="resize-none"
            rows={2}
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            size="sm"
            className="bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90 self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};