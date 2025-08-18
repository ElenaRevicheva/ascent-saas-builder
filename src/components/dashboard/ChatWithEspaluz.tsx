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
import { useFreeMessages } from '@/hooks/useFreeMessages';
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
  audioUrl?: string; // For voice of full message
  videoUrl?: string; // For avatar video file
  videoAudioUrl?: string; // For video script audio (separate from voice)
}

interface ChatWithEspaluzProps {
  
  onUpgradeClick?: () => void;
}

export const ChatWithEspaluz = ({ onUpgradeClick }: ChatWithEspaluzProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { recordChatLearning } = useLearningProgress();
  const { 
    freeMessagesUsed, 
    remainingMessages, 
    hasReachedLimit, 
    isNearLimit, 
    incrementMessageCount,
    FREE_MESSAGE_LIMIT 
  } = useFreeMessages();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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
    if (!user) {
      // Load free trial messages from localStorage for non-authenticated users
      const savedFreeTrialMessages = localStorage.getItem('espaluz-free-trial-messages');
      if (savedFreeTrialMessages) {
        try {
          const parsedMessages = JSON.parse(savedFreeTrialMessages).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(parsedMessages);
        } catch (error) {
          console.error('Error parsing free trial messages:', error);
        }
      }
    } else if (user) {
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

  const extractVideoScript = (text: string): string | null => {
    const startTag = '[VIDEO SCRIPT START]';
    const endTag = '[VIDEO SCRIPT END]';
    const startIndex = text.indexOf(startTag);
    const endIndex = text.indexOf(endTag);
    
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      return null;
    }
    
    return text.substring(startIndex + startTag.length, endIndex).trim();
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    // Check free message limitations for non-authenticated users
    if (!user) {
      if (hasReachedLimit) {
        toast.error('Free message limit reached! Sign up to continue unlimited conversations.');
        onUpgradeClick?.();
        return;
      }
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
    
    // Increment message count for non-authenticated users
    if (!user) {
      incrementMessageCount();
    }

    try {
      let aiMessage: ChatMessage;
      
      // Use full AI functionality for both authenticated and non-authenticated users
      // This gives free trial users the complete experience
      const { data, error } = await supabase.functions.invoke('espaluz-chat', {
        body: {
          message: userMessage.content,
          userId: user?.id || 'free-trial-user', // Use placeholder ID for free trial users
          systemPrompt: `You are EspaLuz, a bilingual Spanish-English AI tutor. Your responses should be warm, encouraging, and educational.

CRITICAL: Your answer MUST have TWO PARTS:
1️⃣ A full, thoughtful bilingual response that helps the user learn
2️⃣ A short video script block inside [VIDEO SCRIPT START] and [VIDEO SCRIPT END] tags:
   - Must fit within 30 seconds of speech (approximately 75-90 words MAX)
   - Use both Spanish and English naturally
   - Keep it concise since the avatar video is exactly 30 seconds long
   - Focus on the key learning point

Example format:
[Your full response here...]

[VIDEO SCRIPT START]
¡Hola! Soy EspaLuz, tu tutora de español. Hello! I'm EspaLuz, your Spanish tutor. Today we're learning colors. Hoy aprendemos los colores.
[VIDEO SCRIPT END]

The video script will be used to generate an avatar video with synchronized audio.`
        }
      });

      if (error) throw error;

      // Extract video script from response
      console.log('🎬 AI RESPONSE for video script extraction:', data.response);
      console.log('🎬 Looking for VIDEO SCRIPT START in response...');
      console.log('🎬 Contains VIDEO SCRIPT START:', data.response.includes('[VIDEO SCRIPT START]'));
      console.log('🎬 Contains VIDEO SCRIPT END:', data.response.includes('[VIDEO SCRIPT END]'));
      
      const extractedVideoScript = extractVideoScript(data.response);
      console.log('🎬 EXTRACTED VIDEO SCRIPT:', extractedVideoScript);

      aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        videoScript: extractedVideoScript || data.videoScript,
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
      
      // Record chat learning session for authenticated users only
      if (user) {
        await recordChatLearning(detectedVocabulary, data.confidence, 2);
      }

      // Add AI message immediately
      setMessages(prev => [...prev, aiMessage]);
      
      // Automatically generate multimedia for all users (free trial gets full experience)
      if (aiMessage) {
        // Generate voice and video in parallel
        setTimeout(() => {
          // Generate voice for full response
          generateVoice(aiMessage.id, aiMessage.content, false);
          
          // Generate video using the AI response content (contains video script markers)
          generateVideo(aiMessage.id, aiMessage.content);
        }, 500); // Small delay to let the message render first
      }
      
      // Save free trial messages to localStorage for non-authenticated users
      if (!user) {
        const updatedMessages = [...messages, userMessage, aiMessage];
        localStorage.setItem('espaluz-free-trial-messages', JSON.stringify(updatedMessages));
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
    
    // Allow voice generation for free trial users (no restrictions)
    // Full functionality showcase for potential subscribers
    
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
          voice: 'nova' // Use OpenAI Nova voice for better multilingual support
        }
      });

      if (error) {
        console.error('❌ Voice generation API error:', error);
        throw error;
      }

      // Check if the edge function returned success
      if (!data.success) {
        console.error('❌ Voice generation failed:', data);
        throw new Error(data.error || 'Voice generation failed');
      }

      console.log(`✅ Voice generated successfully`);
      console.log('Voice generation response:', data);

      let audioUrl;
      
      // Handle different response formats from the edge function
      if (data.audioUrl) {
        // New format: direct audio URL from storage
        audioUrl = data.audioUrl;
        console.log('✅ Using direct audio URL from storage');
      } else if (data.audioContent || data.audioBase64) {
        // OpenAI format: audioContent or old format: base64 audio data
        const base64Data = data.audioContent || data.audioBase64;
        const audioBlob = base64ToAudioBlob(base64Data);
        audioUrl = URL.createObjectURL(audioBlob);
        console.log('✅ Converted base64 to blob URL');
      } else {
        console.error('❌ No audio data received. Response:', data);
        throw new Error('No audio data received in response');
      }

      // Update message with audio URL
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, audioUrl } : msg
      ));

      toast.success('Voice generated successfully!');
    } catch (error) {
      console.error('❌ Voice generation error:', error);
      
      // Handle voice generation errors
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        toast.error('Voice generation rate limit exceeded. Please wait a moment and try again.');
      } else if (error.message === 'ACCESS_DENIED') {
        toast.error('Access denied to voice service. Please try again later.');
      } else {
        toast.error('Failed to generate voice using OpenAI TTS');
      }
    } finally {
      setLoadingMedia(prev => ({ ...prev, [messageId]: null }));
    }
  };

  const generateVideo = async (messageId: string, videoScript: string) => {
    if (loadingMedia[messageId] === 'video') return;
    
    // Allow video generation for free trial users (no restrictions)
    // Full functionality showcase for potential subscribers
    
    setLoadingMedia(prev => ({ ...prev, [messageId]: 'video' }));
    
    try {
      console.log('🎬 VIDEO DEBUG - Calling generate-video with script:', videoScript);
      console.log('🎬 VIDEO DEBUG - Script length:', videoScript.length);
      console.log('🎬 VIDEO DEBUG - Script preview:', videoScript.substring(0, 300) + '...');
      console.log('🎬 VIDEO DEBUG - Script type:', typeof videoScript);
      console.log('🎬 VIDEO DEBUG - Is videoScript truthy:', !!videoScript);
      
        const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { 
          videoScript,
          voice: 'es', // Use Spanish Google TTS like voice messages
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

      // Create audio blob from base64 using enhanced function
      const audioBlob = base64ToAudioBlob(data.audioContent);
      const audioUrl = URL.createObjectURL(audioBlob);

      // Check if user has uploaded their own avatar video
      console.log('userAvatarUrl from response:', data.userAvatarUrl);
      
      console.log('🎬 Generate video response data:', data);
      
      if (data.userAvatarUrl && data.userAvatarUrl.includes('.mp4')) {
        // Check if avatar video is accessible before proceeding
        console.log('🎬 Checking avatar video URL:', data.userAvatarUrl);
        
        try {
          const videoResponse = await fetch(data.userAvatarUrl, { method: 'HEAD' });
          if (!videoResponse.ok) {
            console.error('🎬 Avatar video not accessible:', videoResponse.status, videoResponse.statusText);
            toast.error('Avatar video not found. Please upload a valid avatar video.');
            return;
          }
          console.log('🎬 Avatar video is accessible');
        } catch (error) {
          console.error('🎬 Failed to check avatar video:', error);
          toast.error('Cannot access avatar video. Please check your network connection.');
          return;
        }

        // Convert base64 audio to blob URL for video script audio
        let videoAudioUrl = '';
        if (data.audioContent) {
          try {
            console.log('🎬 Converting audio content to blob URL...');
            const binaryString = atob(data.audioContent);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const audioBlob = new Blob([bytes], { type: data.mimeType || 'audio/mpeg' });
            videoAudioUrl = URL.createObjectURL(audioBlob);
            console.log('🎬 Created video audio blob URL:', videoAudioUrl);
          } catch (error) {
            console.error('🎬 Failed to create video audio blob:', error);
            toast.error('Failed to process video audio.');
            return;
          }
        } else {
          console.error('🎬 No audio content in response');
          toast.error('No audio content received for video.');
          return;
        }
        
         setMessages(prev => prev.map(msg => 
           msg.id === messageId ? { 
             ...msg, 
             videoUrl: data.userAvatarUrl, 
             videoAudioUrl: videoAudioUrl // Store video script audio separately from voice audio
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
    const message = messages.find(msg => msg.id === messageId);
    if (!message || !message.videoAudioUrl) {
      console.error('🎬 No video audio URL found for video playback');
      console.log('🎬 Message:', message);
      toast.error('Video audio not available. Please regenerate the video.');
      return;
    }

    if (playingVideo === messageId) {
      // Stop video and audio
      setPlayingVideo(null);
      if (videoRefs.current[messageId]) {
        videoRefs.current[messageId].pause();
        videoRefs.current[messageId].currentTime = 0;
      }
      if (audioRefs.current[`${messageId}-video`]) {
        audioRefs.current[`${messageId}-video`].pause();
        audioRefs.current[`${messageId}-video`].currentTime = 0;
      }
    } else {
      // Start video and audio synchronized
      setPlayingVideo(messageId);
      
      // Create audio if it doesn't exist - use separate key for video audio
      const videoAudioKey = `${messageId}-video`;
      if (!audioRefs.current[videoAudioKey]) {
        audioRefs.current[videoAudioKey] = new Audio(message.videoAudioUrl);
        audioRefs.current[videoAudioKey].onended = () => {
          console.log('🎬 Video audio ended');
          setPlayingVideo(null);
          if (videoRefs.current[messageId]) {
            videoRefs.current[messageId].pause();
            videoRefs.current[messageId].currentTime = 0;
          }
        };
        // Video should loop, but audio should not
        audioRefs.current[videoAudioKey].loop = false;
      }
      
      // Synchronize audio and video playback
      const video = videoRefs.current[messageId];
      const audio = audioRefs.current[videoAudioKey];
      
      if (video && audio) {
        console.log('🎬 Starting synchronized video and audio playback');
        console.log('🎬 Video URL:', message.videoUrl);
        console.log('🎬 Audio URL:', message.videoAudioUrl);
        
        // Reset both to start
        video.currentTime = 0;
        audio.currentTime = 0;
        
        // Play both simultaneously
        Promise.all([
          video.play().catch(e => console.error('🎬 Video play failed:', e)),
          audio.play().catch(e => console.error('🎧 Audio play failed:', e))
        ]).then(() => {
          console.log('🎬 Video and audio started successfully');
        }).catch(e => {
          console.error('🎬 Failed to start synchronized playback:', e);
          toast.error('Failed to play video with audio');
          setPlayingVideo(null);
        });
      }
    }
  };

  const startRecording = async () => {
    // Check free message limit for non-authenticated users
    if (!user && hasReachedLimit) {
      toast.error('Free message limit reached! Sign up to continue unlimited conversations.');
      onUpgradeClick?.();
      return;
    }
    
    // Allow voice recording for free trial users within their limit
    
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
          
          // Increment message count for non-authenticated users
          if (!user) {
            incrementMessageCount();
          }
          
          // Send to Espaluz for bilingual response
          const { data: chatData, error: chatError } = await supabase.functions.invoke('espaluz-chat', {
            body: {
              message: transcribedText,
              userId: user?.id || 'free-trial-user', // Use placeholder ID for free trial users
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
          
          // Record voice chat learning session for authenticated users only
          if (user) {
            await recordChatLearning(detectedVocabulary, chatData.confidence, 3);
          }
          
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

  return (
    <div className="space-y-4">
      {/* Free Messages Information Banner */}
      {!user && (
        <Alert className="border-[hsl(var(--espaluz-primary))]/20 bg-gradient-to-r from-orange-50 to-pink-50">
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                🎯 Free Trial - {remainingMessages} messages remaining
              </span>
              {isNearLimit && (
                <Badge variant="destructive" className="animate-pulse">
                  <Crown className="h-3 w-3 mr-1" />
                  Sign Up Soon!
                </Badge>
              )}
            </div>
            <div className="text-sm space-y-1">
              <p>✨ <strong>You're experiencing the full EspaLuz features! Sign up for unlimited access:</strong></p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                <span>• Unlimited conversations</span>
                <span>• Unlimited voice & video generation</span>
                <span>• Family member profiles</span>
                <span>• Progress tracking & analytics</span>
                <span>• Personalized learning paths</span>
                <span>• All conversations saved forever</span>
              </div>
              <Button 
                size="sm" 
                className="mt-2 bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
                onClick={onUpgradeClick}
              >
                <Star className="h-3 w-3 mr-1" />
                Sign Up & Subscribe Now!
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-border/50 shadow-magical h-96" style={{ background: 'var(--gradient-card)' }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
            Chat with EspaLuz
            <Heart className="h-4 w-4 text-[hsl(var(--espaluz-secondary))]" />
            {!user && (
              <Badge variant="outline" className="text-xs">
                Free Trial
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
                       
                      {/* Manual Control Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Voice Generation Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateVoice(message.id, message.content)}
                          disabled={loadingMedia[message.id] === 'voice'}
                          className="h-7 px-2 text-xs hover:bg-blue-50"
                        >
                          {loadingMedia[message.id] === 'voice' ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                          ) : (
                            <Volume2 className="h-3 w-3 mr-1" />
                          )}
                          {message.audioUrl ? 'Regenerate Voice' : 'Generate Voice'}
                        </Button>

                         {/* Video Generation Button */}
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => generateVideo(message.id, message.content)}
                           disabled={loadingMedia[message.id] === 'video'}
                           className="h-7 px-2 text-xs hover:bg-purple-50"
                         >
                           {loadingMedia[message.id] === 'video' ? (
                             <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                           ) : (
                             <Video className="h-3 w-3 mr-1" />
                           )}
                           {message.videoUrl ? 'Regenerate Video' : 'Generate Video'}
                         </Button>
                      </div>
                      {/* Multimedia Generation Status */}
                      {(loadingMedia[message.id] === 'voice' || loadingMedia[message.id] === 'video') && (
                        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 rounded-lg p-3 mt-2">
                          <div className="flex items-center gap-2 text-sm text-purple-700">
                            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <span>
                              {loadingMedia[message.id] === 'voice' ? '🎧 Generating voice audio...' : '🎬 Creating avatar video...'}
                            </span>
                          </div>
                          <div className="text-xs text-purple-600 mt-1">
                            {loadingMedia[message.id] === 'voice' 
                              ? 'Converting text to natural speech using Nova voice'
                              : 'Syncing audio with avatar video (30 seconds)'
                            }
                          </div>
                        </div>
                      )}

                      {/* Enhanced Multimedia Players */}
                      {(message.audioUrl || message.videoUrl) && (
                        <div className="mt-3 space-y-3">
                          {/* Audio Player */}
                          {message.audioUrl && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => playAudio(message.id, message.audioUrl!)}
                                    className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded-full"
                                  >
                                    {playingAudio === message.id ? (
                                      <Pause className="h-4 w-4" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <div className="text-sm font-medium text-blue-700">Voice Audio</div>
                                </div>
                                <a
                                  href={message.audioUrl}
                                  download={`espaluz-voice-${message.id}.mp3`}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  Download
                                </a>
                              </div>
                              {playingAudio === message.id && (
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex-1 h-1 bg-blue-200 rounded">
                                    <div className="h-1 bg-blue-500 rounded animate-pulse w-1/3"></div>
                                  </div>
                                  <span className="text-xs text-blue-600">Playing...</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Video Player */}
                          {message.videoUrl && message.videoAudioUrl && (
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                              <div className="flex items-start gap-3">
                                {/* Video Display */}
                                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-purple-100 flex-shrink-0">
                                    {message.videoUrl.includes('.mp4') || message.videoUrl.includes('video') || message.videoUrl.includes('avatar.mp4') ? (
                                      <video
                                        ref={el => {
                                          if (el) {
                                            videoRefs.current[message.id] = el as any;
                                            console.log('🎬 Video element set up for message:', message.id);
                                            console.log('🎬 Video src set to:', message.videoUrl);
                                          }
                                        }}
                                        className="w-full h-full object-cover"
                                        loop
                                        playsInline
                                        controls={false}
                                        preload="metadata"
                                        onLoadedData={() => {
                                          console.log('🎬 Video loaded successfully for message:', message.id);
                                          console.log('🎬 Video duration:', videoRefs.current[message.id]?.duration);
                                        }}
                                        onError={(e) => {
                                          console.error('🎬 Video error for message:', message.id, e);
                                          console.error('🎬 Video URL causing error:', message.videoUrl);
                                        }}
                                        onEnded={() => setPlayingVideo(null)}
                                      >
                                        <source src={message.videoUrl} type="video/mp4" />
                                        Your browser does not support the video tag.
                                      </video>
                                  ) : (
                                    <img 
                                      src={message.videoUrl.startsWith('blob:') ? message.videoUrl : avatarImage} 
                                      alt="EspaLuz Avatar"
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  
                                </div>

                                 {/* Video Info and Controls */}
                                 <div className="flex-1 min-w-0">
                                   <div className="flex items-center justify-between">
                                     <div className="text-sm font-medium text-purple-700">Avatar Video</div>
                                     <div className="flex items-center gap-2">
                                       <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                                         30s
                                       </Badge>
                                       <Button
                                         size="sm"
                                         variant="ghost"
                                         onClick={() => playVideo(message.id)}
                                         className="h-6 w-6 p-0 bg-purple-500 hover:bg-purple-600 text-white rounded-full"
                                       >
                                         {playingVideo === message.id ? (
                                           <Pause className="h-3 w-3" />
                                         ) : (
                                           <Play className="h-3 w-3" />
                                         )}
                                       </Button>
                                     </div>
                                   </div>
                                   <div className="text-xs text-purple-600 mt-1">
                                     EspaLuz speaking with synchronized audio
                                   </div>
                                  {playingVideo === message.id && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <div className="flex-1 h-1 bg-purple-200 rounded">
                                        <div className="h-1 bg-purple-500 rounded animate-pulse w-2/3"></div>
                                      </div>
                                      <span className="text-xs text-purple-600">Playing</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
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