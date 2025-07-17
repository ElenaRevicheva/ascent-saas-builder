import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, BookOpen, Clock, Trophy, TrendingUp, Star, Brain, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadTelegramProgress();
    }
  }, [user]);

  // Auto-refresh every 5 seconds for better responsiveness
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        loadTelegramProgress(false); // Silent refresh
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Real-time subscription for new sessions
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscription for user:', user.id);
    
    const channel = supabase
      .channel('telegram-sessions-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'learning_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Real-time: New learning session detected:', payload);
          if (payload.new.source === 'telegram') {
            loadTelegramProgress(false);
            toast.success('New Telegram conversation recorded! 🎉');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'learning_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Real-time: Learning session updated:', payload);
          if (payload.new.source === 'telegram') {
            loadTelegramProgress(false);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadTelegramProgress = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      console.log('🔄 Loading Telegram progress for user:', user?.id);
      
      // Get both telegram and telegram_chat sources
      const { data: telegramSessions, error } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .in('source', ['telegram', 'telegram_chat'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error loading Telegram sessions:', error);
        throw error;
      }

      console.log('📊 Loaded sessions:', telegramSessions?.length || 0);
      console.log('📊 Session details:', telegramSessions?.map(s => ({
        id: s.id.substring(0, 8),
        created: s.created_at,
        source: s.source,
        hasContent: !!s.content,
        hasProgressData: !!s.progress_data
      })));

      setSessions(telegramSessions || []);
      setLastRefresh(new Date());
      
      // Set debug info
      setDebugInfo({
        user_id: user?.id,
        sessions_found: telegramSessions?.length || 0,
        last_session: telegramSessions?.[0]?.created_at || 'None',
        sources: [...new Set(telegramSessions?.map(s => s.source) || [])]
      });
      
    } catch (error) {
      console.error('❌ Error loading Telegram progress:', error);
      toast.error('Failed to load Telegram progress');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    loadTelegramProgress(true);
    toast.info('Refreshing your Telegram progress...');
  };

  const checkBotConnection = async () => {
    if (!user) return;
    
    try {
      console.log('🔍 Checking bot connection for user:', user.id);
      
      const { data: connectedBots, error } = await supabase
        .from('connected_bots')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'telegram')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error checking bot connection:', error);
        toast.error('Error checking bot connection');
        return;
      }

      console.log('🤖 Connected bots:', connectedBots);
      
      if (!connectedBots || connectedBots.length === 0) {
        toast.error('No Telegram bot connected. Please connect your bot first.');
      } else {
        toast.success(`Found ${connectedBots.length} connected Telegram bot(s)`);
        setDebugInfo(prev => ({
          ...prev,
          connected_bots: connectedBots.length,
          bot_details: connectedBots.map(b => ({
            platform_user_id: b.platform_user_id,
            last_activity: b.last_activity,
            platform_username: b.platform_username
          }))
        }));
      }
    } catch (error) {
      console.error('❌ Error in bot connection check:', error);
      toast.error('Failed to check bot connection');
    }
  };

  const getEnhancedStats = () => {
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    
    // Extract vocabulary from progress_data (new structure)
    const allVocabulary: string[] = [];
    const allPhrases: string[] = [];
    const allTopics: string[] = [];
    
    sessions.forEach(session => {
      // Handle new progress_data structure
      if (session.progress_data?.vocabulary_learned) {
        allVocabulary.push(...session.progress_data.vocabulary_learned);
      }
      if (session.progress_data?.phrases_practiced) {
        allPhrases.push(...session.progress_data.phrases_practiced);
      }
      if (session.progress_data?.topics_discussed) {
        allTopics.push(...session.progress_data.topics_discussed);
      }
      
      // Legacy support for old structure
      if (session.content?.bot_response) {
        const botResponse = session.content.bot_response;
        const vocabMatches = botResponse.match(/\*\*([^*]+)\*\*/g);
        if (vocabMatches) {
          vocabMatches.forEach((match: string) => {
            const word = match.replace(/\*\*/g, '').trim();
            if (word.length > 1) allVocabulary.push(word);
          });
        }
      }
    });
    
    const uniqueVocabulary = [...new Set(allVocabulary)];
    const uniquePhrases = [...new Set(allPhrases)];
    const uniqueTopics = [...new Set(allTopics)];
    
    // Calculate learning insights
    const avgSessionLength = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    const vocabularyDiversity = uniqueVocabulary.length + uniquePhrases.length;
    const learningScore = Math.min(100, Math.round((vocabularyDiversity * 8) + (totalSessions * 10)));
    
    return {
      totalSessions,
      totalMinutes,
      vocabularyCount: uniqueVocabulary.length,
      uniqueVocabulary: uniqueVocabulary.slice(0, 20),
      phrases: uniquePhrases.slice(0, 15),
      topics: uniqueTopics.slice(0, 8),
      insights: {
        avgSessionLength,
        vocabularyDiversity,
        learningScore,
        mostActiveDay: sessions.length > 0 ? new Date(sessions[0].created_at).toLocaleDateString() : null,
        streak: Math.min(7, totalSessions)
      }
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

  const stats = getEnhancedStats();

  return (
    <div className="space-y-6">
      {/* Header Card with Learning Score and Debug Info */}
      <Card className="border-border/50 shadow-magical bg-gradient-to-br from-[hsl(var(--espaluz-primary))]/5 to-purple-500/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-[hsl(var(--espaluz-primary))]/20 rounded-lg">
                <MessageSquare className="h-6 w-6 text-[hsl(var(--espaluz-primary))]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Telegram Bot Learning Journey</h2>
                <p className="text-sm text-muted-foreground font-normal">Your Spanish learning progress from bot conversations</p>
              </div>
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-bold text-[hsl(var(--espaluz-primary))]">{stats.insights.learningScore}</div>
                <div className="text-xs text-muted-foreground">Learning Score</div>
                <Progress value={stats.insights.learningScore} className="w-16 h-2 mt-1" />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkBotConnection}
                  className="flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  Check Bot
                </Button>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Last updated: {lastRefresh.toLocaleTimeString()} | Found {sessions.length} conversations
          </div>
          
          {/* Debug Information */}
          {debugInfo && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg text-xs">
              <details>
                <summary className="cursor-pointer font-medium">Debug Info (click to expand)</summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Enhanced Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl border border-blue-500/20">
              <div className="flex items-center justify-center mb-2">
                <MessageSquare className="h-5 w-5 text-blue-500 mr-2" />
                <div className="text-2xl font-bold text-blue-600">{stats.totalSessions}</div>
              </div>
              <div className="text-sm text-muted-foreground">Chat Sessions</div>
              {stats.insights.streak > 0 && (
                <div className="text-xs text-blue-600 mt-1">🔥 {stats.insights.streak} session streak</div>
              )}
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-[hsl(var(--espaluz-primary))]/10 to-[hsl(var(--espaluz-primary))]/5 rounded-xl border border-[hsl(var(--espaluz-primary))]/20">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="h-5 w-5 text-[hsl(var(--espaluz-primary))] mr-2" />
                <div className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">{stats.phrases.length}</div>
              </div>
              <div className="text-sm text-muted-foreground">Spanish Phrases</div>
              <div className="text-xs text-[hsl(var(--espaluz-primary))] mt-1">Core expressions</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-xl border border-yellow-500/20">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-5 w-5 text-yellow-600 mr-2" />
                <div className="text-2xl font-bold text-yellow-600">{stats.vocabularyCount}</div>
              </div>
              <div className="text-sm text-muted-foreground">Words Mastered</div>
              <div className="text-xs text-yellow-600 mt-1">Building vocabulary</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl border border-green-500/20">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-green-600 mr-2" />
                <div className="text-2xl font-bold text-green-600">{stats.totalMinutes}m</div>
              </div>
              <div className="text-sm text-muted-foreground">Time Invested</div>
              <div className="text-xs text-green-600 mt-1">Avg: {stats.insights.avgSessionLength}m/session</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Topics & Insights */}
      {stats.topics.length > 0 && (
        <Card className="border-border/50 shadow-magical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              Your Learning Topics & Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h5 className="font-medium mb-3 text-sm">Topics You're Exploring</h5>
                <div className="space-y-2">
                  {stats.topics.map((topic, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg">
                      <Star className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">{topic}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="font-medium mb-3 text-sm">Learning Insights</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Vocabulary diversity: <strong>{stats.insights.vocabularyDiversity} unique items</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span>Most active: <strong>{stats.insights.mostActiveDay || 'Today'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span>Learning consistency: <strong>{stats.insights.avgSessionLength}min average</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Conversations */}
      {sessions.length > 0 && (
        <Card className="border-border/50 shadow-magical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Recent Telegram Conversations ({sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.slice(0, 10).map((session) => (
                <div key={session.id} className="p-4 bg-gradient-to-r from-background/80 to-background/40 border border-border/50 rounded-lg hover-scale transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">
                        {new Date(session.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {session.source}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/20">
                      {session.duration_minutes || 2}min chat
                    </Badge>
                  </div>
                  
                  {session.content?.user_message && (
                    <div className="text-sm text-muted-foreground mb-3 p-2 bg-muted/30 rounded-md italic border-l-2 border-[hsl(var(--espaluz-primary))]/30">
                      "You: {session.content.user_message.substring(0, 150)}{session.content.user_message.length > 150 ? '...' : ''}"
                    </div>
                  )}
                  
                  {/* Display learned vocabulary from new structure */}
                  {session.progress_data?.vocabulary_learned?.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-muted-foreground mb-1">Words learned:</div>
                      <div className="flex flex-wrap gap-1">
                        {session.progress_data.vocabulary_learned.slice(0, 6).map((word: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs bg-[hsl(var(--espaluz-primary))]/10 border-[hsl(var(--espaluz-primary))]/20">
                            {word}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Display topics */}
                  {session.progress_data?.topics_discussed?.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Topics discussed:</div>
                      <div className="flex flex-wrap gap-1">
                        {session.progress_data.topics_discussed.map((topic: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Sessions Message */}
      {sessions.length === 0 && (
        <Card className="border-border/50 shadow-magical">
          <CardContent className="text-center py-12">
            <div className="w-20 h-20 bg-[hsl(var(--espaluz-primary))]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-10 w-10 text-[hsl(var(--espaluz-primary))]/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Start Your Spanish Journey!</h3>
            <p className="text-muted-foreground mb-1">No Telegram conversations yet.</p>
            <p className="text-sm text-muted-foreground">Connect with your Spanish learning bot to see detailed progress here!</p>
            <div className="flex justify-center gap-3 mt-4">
              <Button 
                onClick={handleManualRefresh}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check for New Conversations
              </Button>
              <Button 
                onClick={checkBotConnection}
                variant="outline"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Check Bot Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
