import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Bot, User, Heart, Volume2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  videoScript?: string;
  familyMember?: string;
  emotion?: string;
  confidence?: number;
  timestamp: Date;
}

export const ChatWithEspaluz = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
                  
                  {/* AI Message Metadata */}
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
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
                          Video
                        </Badge>
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