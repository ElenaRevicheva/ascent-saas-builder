import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Send, Bot, User, Heart, Volume2, Play, Video, Pause, Mic, MicOff, Square, Crown, Info, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useLearningProgress } from '@/hooks/useLearningProgress';
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

interface ChatWithEspaluzProps {
  demoMode?: boolean;
  onUpgradeClick?: () => void;
}

export const ChatWithEspaluz = ({ demoMode = false, onUpgradeClick }: ChatWithEspaluzProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { recordChatLearning } = useLearningProgress();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoMessageCount, setDemoMessageCount] = useState(0);
  const [loadingMedia, setLoadingMedia] = useState<{[key: string]: 'voice' | 'video' | null}>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingLanguage, setRecordingLanguage] = useState<'ru' | 'en' | 'es'>('en');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<{[key: string]: HTMLAudioElement}>({});
  const videoRefs = useRef<{[key: string]: HTMLVideoElement}>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (demoMode) {
      // Load demo messages from localStorage
      const savedDemoMessages = localStorage.getItem('espaluz-demo-messages');
      const savedDemoCount = localStorage.getItem('espaluz-demo-count');
      if (savedDemoMessages) {
        try {
          const parsedMessages = JSON.parse(savedDemoMessages).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(parsedMessages);
        } catch (error) {
          console.error('Error parsing demo messages:', error);
        }
      }
      if (savedDemoCount) {
        setDemoMessageCount(parseInt(savedDemoCount));
      }
    } else if (user) {
      loadChatHistory();
    }
  }, [user, demoMode]);

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
    if (!input.trim() || loading) return;
    
    // Check demo limitations
    if (demoMode) {
      if (demoMessageCount >= 20) {
        toast.error('Demo limit reached! Subscribe to continue unlimited conversations.');
        onUpgradeClick?.();
        return;
      }
      if (!user) {
        // Demo mode without authentication
      }
    } else if (!user) {
      return;
    }

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
      let aiMessage: ChatMessage;
      
      if (demoMode && !user) {
        // Demo mode - provide a simple bilingual response
        const demoResponses = [
          "¡Hola! Hello! I'm EspaLuz, your bilingual language coach. How can I help you practice Spanish and English today? ¿Cómo puedo ayudarte?",
          "¡Excelente! That's great! I love helping families learn together. What would you like to practice? ¿Qué te gustaría practicar?",
          "¡Muy bien! Very good! Keep practicing - every conversation helps you improve. Remember, in our full version, I can generate videos, voice, and track your family's progress!",
          "¡Fantástico! I see you're enjoying our demo! With a subscription, I can create personalized lessons for your whole family and remember everything we learn together.",
          "That's wonderful practice! In the full version, I create custom content for each family member and track everyone's learning journey. ¿Te gustaría saber más?"
        ];
        
        const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)];
        
        aiMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: randomResponse,
          timestamp: new Date()
        };
        
        // Update demo count
        const newCount = demoMessageCount + 1;
        setDemoMessageCount(newCount);
        localStorage.setItem('espaluz-demo-count', newCount.toString());
        
      } else {
        // Full functionality for authenticated users
        const { data, error } = await supabase.functions.invoke('espaluz-chat', {
          body: {
            message: userMessage.content,
            userId: user?.id
          }
        });

        if (error) throw error;

        aiMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          videoScript: data.videoScript,
          familyMember: data.familyMember,
          emotion: data.emotion,
          confidence: data.confidence,
          timestamp: new Date()
        };
        
        // Show emotion detection if confidence is high
        if (data.confidence > 0.6) {
          toast.success(`${t('chat.emotionDetected')}: ${data.emotion} (${Math.round(data.confidence * 100)}%)`);
        }

        // Extract vocabulary from AI response for learning tracking
        const vocabularyPattern = /\b[a-záéíóúñü]+\b/gi;
        const detectedVocabulary = data.response.match(vocabularyPattern)?.slice(0, 5) || [];
        
        // Record chat learning session
        if (user) {
          await recordChatLearning(detectedVocabulary, data.confidence, 2);
        }
      }

      setMessages(prev => [...prev, aiMessage]);
      
      // Save demo messages to localStorage
      if (demoMode) {
        const updatedMessages = [...messages, userMessage, aiMessage];
        localStorage.setItem('espaluz-demo-messages', JSON.stringify(updatedMessages));
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

  // Enhanced base64 to audio blob conversion
  const base64ToAudioBlob = (base64Audio: string): Blob => {
    try {
      // Remove data URL prefix if present
      const base64Data = base64Audio.replace(/^data:audio\/[^;]+;base64,/, '');
      
      // Convert base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create blob with proper MIME type
      return new Blob([bytes], { type: 'audio/mpeg' });
    } catch (error) {
      console.error('❌ Error converting base64 to blob:', error);
      throw new Error('Failed to create audio blob');
    }
  };

  const generateVoice = async (messageId: string, text: string, isVideoScript = false) => {
    if (loadingMedia[messageId] === 'voice') return;
    
    if (demoMode && !user) {
      toast.info('Voice generation is available with subscription! Subscribe to unlock all features.');
      onUpgradeClick?.();
      return;
    }
    
    console.log('🎧 Generating voice audio for text length:', text.length);
    setLoadingMedia(prev => ({ ...prev, [messageId]: 'voice' }));
    
    let textToSpeak = text;
    
    // Only clean text if this is NOT a video script and NOT the full text request
    if (!isVideoScript) {
      // For regular text messages, use the FULL text - don't remove video script sections
      // Users want to hear the complete message when they click voice
      console.log('Generating voice for full text message');
      textToSpeak = text.trim();
    } else {
      // For video scripts, just clean up formatting
      textToSpeak = text
        .replace(/\[VIDEO SCRIPT START\]/g, '')
        .replace(/\[VIDEO SCRIPT END\]/g, '')
        .trim();
    }
    
    console.log('🎧 VOICE DEBUG - Text to speak:', textToSpeak.substring(0, 200) + '...');
    console.log('🎧 VOICE DEBUG - Full text length:', textToSpeak.length);
    console.log('🎧 VOICE DEBUG - Original message content length:', text.length);
    console.log('🎧 VOICE DEBUG - isVideoScript flag:', isVideoScript);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-voice', {
        body: { 
          text: textToSpeak,
          voice: 'es' // Use Spanish voice consistently for EspaLuz
        }
      });

      if (error) {
        console.error('❌ Voice generation API error:', error);
        throw error;
      }

      if (!data.success || !data.audioBase64) {
        console.error('❌ Voice generation failed:', data);
        throw new Error(data.error || 'No audio data received');
      }

      console.log(`✅ Voice generated successfully`);
      if (data.failedChunks && data.failedChunks.length > 0) {
        console.warn(`⚠️ Some chunks failed: ${data.failedChunks.join(', ')}`);
      }

      // Convert base64 to blob URL using enhanced function
      const audioBlob = base64ToAudioBlob(data.audioBase64);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log('✅ Audio blob created and URL generated');

      // Update message with audio URL
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, audioUrl } : msg
      ));

      toast.success('Voice generated successfully!');
    } catch (error) {
      console.error('❌ Voice generation error:', error);
      
      // Handle specific Google TTS errors
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        toast.error('Google TTS rate limit exceeded. Please wait a moment and try again.');
      } else if (error.message === 'ACCESS_DENIED') {
        toast.error('Access denied to Google TTS. Please try again later.');
      } else {
        toast.error('Failed to generate voice using Google TTS');
      }
    } finally {
      setLoadingMedia(prev => ({ ...prev, [messageId]: null }));
    }
  };

  const generateVideo = async (messageId: string, videoScript: string) => {
    if (loadingMedia[messageId] === 'video') return;
    
    if (demoMode && !user) {
      toast.info('Video generation is available with subscription! Subscribe to unlock all features.');
      onUpgradeClick?.();
      return;
    }
    
    setLoadingMedia(prev => ({ ...prev, [messageId]: 'video' }));
    
    try {
      console.log('🎬 VIDEO DEBUG - Calling generate-video with script:', videoScript);
      console.log('🎬 VIDEO DEBUG - Script length:', videoScript.length);
      console.log('🎬 VIDEO DEBUG - Script preview:', videoScript.substring(0, 300) + '...');
      
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { 
          videoScript,
          voice: 'es', // Use Spanish voice consistently like voice messages
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
      console.log('userAvatarUrl from response:', data.userAvatarUrl);
      
      if (data.userAvatarUrl && data.userAvatarUrl.includes('.mp4')) {
        // User has their own avatar video - use it directly
        console.log('Using avatar video URL:', data.userAvatarUrl);
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { 
            ...msg, 
            videoUrl: data.userAvatarUrl, 
            audioUrl 
          } : msg
        ));
      } else {
        // Fallback to static image
        console.log('Falling back to static image');
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
      
      // Handle specific Google TTS errors
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        toast.error('Google TTS rate limit exceeded. Please wait a moment and try again.');
      } else if (error.message === 'ACCESS_DENIED') {
        toast.error('Access denied to Google TTS. Please try again later.');
      } else {
        toast.error(`Failed to generate video: ${error.message || 'Unknown error'}`);
      }
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

  const startRecording = async () => {
    if (demoMode && !user) {
      toast.info('Voice recording is available with subscription! Subscribe to unlock all features.');
      onUpgradeClick?.();
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processVoiceMessage(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.success(`Recording in ${recordingLanguage === 'ru' ? 'Russian' : recordingLanguage === 'es' ? 'Spanish' : 'English'}...`);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceMessage = async (audioBlob: Blob) => {
    try {
      setLoading(true);
      
      // Convert audio to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        try {
          // Convert speech to text
          const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('voice-to-text', {
            body: { 
              audio: base64Audio,
              language: recordingLanguage 
            }
          });

          if (transcriptionError) {
            console.error('Transcription error:', transcriptionError);
            throw new Error(`Speech recognition failed: ${transcriptionError.message || 'Unknown error'}`);
          }
          
          if (!transcriptionData || !transcriptionData.text) {
            throw new Error('No text was transcribed from the audio');
          }
          
          const transcribedText = transcriptionData.text;
          toast.success(`Transcribed: "${transcribedText.substring(0, 50)}${transcribedText.length > 50 ? '...' : ''}"`);
          
          // Add user message with transcribed text
          const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: transcribedText,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, userMessage]);
          
          // Send to Espaluz for bilingual response
          const { data: chatData, error: chatError } = await supabase.functions.invoke('espaluz-chat', {
            body: {
              message: transcribedText,
              userId: user?.id,
              isVoiceInput: true,
              originalLanguage: recordingLanguage
            }
          });

          if (chatError) throw chatError;

          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: chatData.response,
            videoScript: chatData.videoScript,
            familyMember: chatData.familyMember,
            emotion: chatData.emotion,
            confidence: chatData.confidence,
            timestamp: new Date()
          };

          setMessages(prev => [...prev, aiMessage]);
          
          // Show emotion detection if confidence is high
          if (chatData.confidence > 0.6) {
            toast.success(`${t('chat.emotionDetected')}: ${chatData.emotion} (${Math.round(chatData.confidence * 100)}%)`);
          }

          // Extract vocabulary from transcribed text for learning tracking
          const vocabularyPattern = /\b[a-záéíóúñü]+\b/gi;
          const detectedVocabulary = transcribedText.match(vocabularyPattern)?.slice(0, 5) || [];
          
          // Record voice chat learning session
          await recordChatLearning(detectedVocabulary, chatData.confidence, 3);
          
        } catch (error) {
          console.error('Error processing voice message:', error);
          toast.error('Failed to process voice message');
        }
      };
    } catch (error) {
      console.error('Error processing voice message:', error);
      toast.error('Failed to process voice message');
    } finally {
      setLoading(false);
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

  const remainingDemoMessages = 20 - demoMessageCount;
  
  return (
    <div className="space-y-4">
      {/* Demo Information Banner */}
      {demoMode && (
        <Alert className="border-[hsl(var(--espaluz-primary))]/20 bg-gradient-to-r from-orange-50 to-pink-50">
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                🎯 Free Demo - {remainingDemoMessages} messages remaining
              </span>
              {remainingDemoMessages <= 5 && (
                <Badge variant="destructive" className="animate-pulse">
                  <Crown className="h-3 w-3 mr-1" />
                  Upgrade Soon!
                </Badge>
              )}
            </div>
            <div className="text-sm space-y-1">
              <p>✨ <strong>With subscription, you get:</strong></p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                <span>• Unlimited conversations</span>
                <span>• Voice & video generation</span>
                <span>• Family member profiles</span>
                <span>• Progress tracking</span>
                <span>• Personalized lessons</span>
                <span>• All conversations saved forever</span>
              </div>
              <Button 
                size="sm" 
                className="mt-2 bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
                onClick={onUpgradeClick}
              >
                <Star className="h-3 w-3 mr-1" />
                Subscribe Now - Keep Everything!
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-border/50 shadow-magical h-96" style={{ background: 'var(--gradient-card)' }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
            {demoMode ? 'Demo: Chat with EspaLuz' : t('chat.title')}
            <Heart className="h-4 w-4 text-[hsl(var(--espaluz-secondary))]" />
            {demoMode && (
              <Badge variant="outline" className="text-xs">
                Demo Mode
              </Badge>
            )}
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
                          {message.videoUrl.includes('.mp4') || message.videoUrl.includes('video') || message.videoUrl.includes('avatar.mp4') ? (
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
                                  // Auto-play when video is loaded
                                  el.addEventListener('loadeddata', () => {
                                    el.play().catch(console.error);
                                  });
                                }
                              }}
                              src={message.videoUrl}
                              className="w-full h-full object-cover"
                              autoPlay
                              loop
                              muted
                              playsInline
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
        
        {/* Voice Controls */}
        <div className="flex items-center gap-2 mb-2">
          <select 
            value={recordingLanguage} 
            onChange={(e) => setRecordingLanguage(e.target.value as 'ru' | 'en' | 'es')}
            className="text-xs px-2 py-1 rounded border bg-background"
            disabled={isRecording}
          >
            <option value="en">🇺🇸 English</option>
            <option value="es">🇪🇸 Spanish</option>
            <option value="ru">🇷🇺 Russian</option>
          </select>
          
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
            size="sm"
            variant={isRecording ? "destructive" : "outline"}
            className="h-8 px-3"
          >
            {isRecording ? (
              <>
                <Square className="h-3 w-3 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Mic className="h-3 w-3 mr-1" />
                Record
              </>
            )}
          </Button>
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chat.placeholder')}
            className="resize-none"
            rows={2}
            disabled={loading || isRecording}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading || isRecording}
            size="sm"
            className="bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90 self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};