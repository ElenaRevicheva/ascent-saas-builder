import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, BookOpen, Clock, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TelegramSession {
  id: string;
  created_at: string;
  duration_minutes: number;
  content: any;
  progress_data: any;
}

export const TelegramProgress = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TelegramSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTelegramProgress();
    }
  }, [user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (user) {
      const interval = setInterval(loadTelegramProgress, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadTelegramProgress = async () => {
    try {
      const { data: telegramSessions, error } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('source', 'telegram')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSessions(telegramSessions || []);
    } catch (error) {
      console.error('Error loading Telegram progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const allVocabulary = sessions.flatMap(s => s.progress_data?.vocabulary_learned || []);
    const uniqueVocabulary = [...new Set(allVocabulary)];
    
    return {
      totalSessions,
      totalMinutes,
      vocabularyCount: uniqueVocabulary.length,
      uniqueVocabulary
    };
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
        <CardContent className="p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--espaluz-primary))] mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  const stats = getTotalStats();

  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Telegram Bot Learning Progress
          <Badge variant="secondary" className="ml-auto">
            {stats.totalSessions} Sessions
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">
              {stats.totalSessions}
            </div>
            <div className="text-sm text-muted-foreground">Chat Sessions</div>
          </div>
          
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">
              {stats.vocabularyCount}
            </div>
            <div className="text-sm text-muted-foreground">Words Learned</div>
          </div>
          
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <div className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">
              {stats.totalMinutes}m
            </div>
            <div className="text-sm text-muted-foreground">Time Spent</div>
          </div>
        </div>

        {/* Vocabulary Learned */}
        {stats.uniqueVocabulary.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Vocabulary from Telegram Chats
            </h4>
            <div className="flex flex-wrap gap-2">
              {stats.uniqueVocabulary.map((word, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Telegram Conversations
            </h4>
            <div className="space-y-3">
              {sessions.slice(0, 3).map((session) => (
                <div key={session.id} className="p-3 bg-background/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {new Date(session.created_at).toLocaleDateString()} at{' '}
                      {new Date(session.created_at).toLocaleTimeString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {session.duration_minutes || 1}min
                    </Badge>
                  </div>
                  
                  {session.content?.user_message && (
                    <div className="text-sm text-muted-foreground mb-2 italic">
                      "{session.content.user_message.substring(0, 80)}..."
                    </div>
                  )}
                  
                  {session.progress_data?.vocabulary_learned?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {session.progress_data.vocabulary_learned.slice(0, 5).map((word: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {word}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Sessions Message */}
        {sessions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No Telegram conversations yet.</p>
            <p className="text-sm">Start chatting with your bot to see progress here!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};