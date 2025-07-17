import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, BookOpen, Clock, Trophy, TrendingUp, Star, Brain, Zap, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TelegramLearningAnalysis } from './TelegramLearningAnalysis';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TelegramSession {
  id: string;
  created_at: string;
  duration_minutes: number;
  content: any;
  progress_data: any;
  source: string;
}

export const TelegramProgress = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TelegramSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadTelegramProgress();
    }
  }, [user]);

  // Auto-refresh every 5 seconds for immediate updates
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        loadTelegramProgress(false); // Silent refresh
      }, 5000); // Reduced to 5 seconds for faster updates
      return () => clearInterval(interval);
    }
  }, [user]);

  // Real-time subscription for new sessions
  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up real-time subscription for user:', user.id);
    
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
          if (payload.new.source === 'telegram' || payload.new.source === 'telegram_chat') {
            loadTelegramProgress(false);
            toast.success('New Telegram conversation recorded! 🎉');
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
      console.log('🕐 Current time:', new Date().toISOString());
      console.log('🕐 30 minutes ago:', new Date(Date.now() - 30 * 60 * 1000).toISOString());
      
      // First, let's check ALL learning sessions for this user to see what's there
      const { data: allSessions, error: allError } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(100);

      console.log('📊 ALL sessions for user:', allSessions?.length || 0);
      console.log('📊 ALL sessions data:', allSessions?.slice(0, 5)); // First 5 sessions

      // Filter sessions from last 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentSessions = allSessions?.filter(session => 
        new Date(session.created_at) >= thirtyMinutesAgo
      ) || [];
      
      console.log('🕐 Recent sessions (last 30 min):', recentSessions.length);
      console.log('🕐 Recent sessions data:', recentSessions);

      // Now get telegram-specific sessions
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

      console.log('📊 Telegram sessions found:', telegramSessions?.length || 0);
      console.log('📊 Telegram sessions sources:', [...new Set(telegramSessions?.map(s => s.source) || [])]);
      
      // Check for recent telegram sessions
      const recentTelegramSessions = telegramSessions?.filter(session => 
        new Date(session.created_at) >= thirtyMinutesAgo
      ) || [];
      
      console.log('🕐 Recent Telegram sessions (last 30 min):', recentTelegramSessions.length);
      
      if (recentTelegramSessions.length > 0) {
        console.log('✅ Found recent Telegram sessions!');
        recentTelegramSessions.forEach((session, index) => {
          console.log(`📋 Recent Session ${index + 1}:`, {
            id: session.id.substring(0, 8),
            created: session.created_at,
            source: session.source,
            minutes_ago: Math.round((Date.now() - new Date(session.created_at).getTime()) / (1000 * 60))
          });
        });
      } else {
        console.log('❌ No recent Telegram sessions found');
      }

      // Enhanced session analysis
      telegramSessions?.forEach((session, index) => {
        console.log(`📋 Session ${index + 1}:`, {
          id: session.id.substring(0, 8),
          created: session.created_at,
          source: session.source,
          session_type: session.session_type,
          content_keys: Object.keys(session.content || {}),
          progress_data_keys: Object.keys(session.progress_data || {}),
          has_user_message: !!(session.content && typeof session.content === 'object' && 'user_message' in session.content),
          has_bot_response: !!(session.content && typeof session.content === 'object' && 'bot_response' in session.content),
          minutes_ago: Math.round((Date.now() - new Date(session.created_at).getTime()) / (1000 * 60))
        });
      });

      setSessions(telegramSessions || []);
      setLastRefresh(new Date());
      
      // Enhanced debug info
      setDebugInfo({
        user_id: user?.id,
        current_time: new Date().toISOString(),
        thirty_minutes_ago: thirtyMinutesAgo.toISOString(),
        all_sessions_count: allSessions?.length || 0,
        telegram_sessions_count: telegramSessions?.length || 0,
        recent_sessions_count: recentSessions.length,
        recent_telegram_sessions_count: recentTelegramSessions.length,
        telegram_sources: [...new Set(telegramSessions?.map(s => s.source) || [])],
        last_session: telegramSessions?.[0]?.created_at || 'None',
        all_sources_found: [...new Set(allSessions?.map(s => s.source) || [])],
        recent_telegram_sessions: recentTelegramSessions.map(s => ({
          id: s.id.substring(0, 8),
          created: s.created_at,
          source: s.source,
          minutes_ago: Math.round((Date.now() - new Date(s.created_at).getTime()) / (1000 * 60))
        }))
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
      if (session.content && typeof session.content === 'object' && 'bot_response' in session.content) {
        const botResponse = session.content.bot_response;
        if (typeof botResponse === 'string') {
          const vocabMatches = botResponse.match(/\*\*([^*]+)\*\*/g);
          if (vocabMatches) {
            vocabMatches.forEach((match: string) => {
              const word = match.replace(/\*\*/g, '').trim();
              if (word.length > 1) allVocabulary.push(word);
            });
          }
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
      {/* Header Card with Learning Score and Enhanced Debug Info */}
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
          
          {/* ENHANCED Debug Information */}
          {debugInfo && (
            <div className="mt-3 p-4 bg-red-500/10 rounded-lg text-xs border border-red-500/30">
              <details>
                <summary className="cursor-pointer font-medium text-red-600">🐛 ENHANCED Debug Info - Why No Recent Sessions? (click to expand)</summary>
                <div className="mt-3 space-y-3">
                  <div className="grid gap-2">
                    <div><strong>User ID:</strong> {debugInfo.user_id}</div>
                    <div><strong>Current Time:</strong> {debugInfo.current_time}</div>
                    <div><strong>30 Min Ago:</strong> {debugInfo.thirty_minutes_ago}</div>
                  </div>
                  
                  <div className="border-t border-red-500/20 pt-2">
                    <div><strong>ALL Learning Sessions:</strong> {debugInfo.all_sessions_count}</div>
                    <div><strong>Recent Sessions (30min):</strong> {debugInfo.recent_sessions_count}</div>
                    <div><strong>All Sources Found:</strong> {debugInfo.all_sources_found.join(', ') || 'None'}</div>
                  </div>
                  
                  <div className="border-t border-red-500/20 pt-2">
                    <div><strong>Telegram Sessions Total:</strong> {debugInfo.telegram_sessions_count}</div>
                    <div><strong>Recent Telegram Sessions:</strong> {debugInfo.recent_telegram_sessions_count}</div>
                    <div><strong>Telegram Sources:</strong> {debugInfo.telegram_sources.join(', ') || 'None'}</div>
                    <div><strong>Last Telegram Session:</strong> {debugInfo.last_session}</div>
                  </div>
                  
                  {debugInfo.recent_telegram_sessions && debugInfo.recent_telegram_sessions.length > 0 && (
                    <div className="border-t border-red-500/20 pt-2">
                      <div><strong>Recent Telegram Sessions Details:</strong></div>
                      <pre className="mt-1 text-xs overflow-auto bg-background/50 p-2 rounded max-h-32">
                        {JSON.stringify(debugInfo.recent_telegram_sessions, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {debugInfo.connected_bots !== undefined && (
                    <div className="border-t border-red-500/20 pt-2">
                      <div><strong>Connected Bots:</strong> {debugInfo.connected_bots}</div>
                      {debugInfo.bot_details && (
                        <pre className="mt-1 text-xs overflow-auto bg-background/50 p-2 rounded">
                          {JSON.stringify(debugInfo.bot_details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
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

      {/* Telegram Sessions */}
      {sessions.length > 0 && (
        <Card className="border-border/50 shadow-magical">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
              Telegram Sessions ({sessions.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">Click on any session to see your learning insights</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.slice(0, 5).map((session) => {
              const isExpanded = expandedSessions.has(session.id);
              const toggleExpansion = () => {
                const newExpanded = new Set(expandedSessions);
                if (isExpanded) {
                  newExpanded.delete(session.id);
                } else {
                  newExpanded.add(session.id);
                }
                setExpandedSessions(newExpanded);
              };

              return (
                <Collapsible key={session.id} open={isExpanded} onOpenChange={toggleExpansion}>
                  <Card className="border border-border/30 hover:border-[hsl(var(--espaluz-primary))]/40 transition-colors">
                    <CollapsibleTrigger asChild>
                      <CardContent className="p-4 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <div className="text-sm font-medium">
                                {new Date(session.created_at).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {session.duration_minutes || 6}min chat
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {session.source}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        
                        {session.content?.user_message && !isExpanded && (
                          <div className="mt-2 text-xs text-muted-foreground p-2 bg-muted/30 rounded border-l-2 border-[hsl(var(--espaluz-primary))]/30">
                            "You: {typeof session.content.user_message === 'string' ? session.content.user_message.substring(0, 80) : 'Message'}{typeof session.content.user_message === 'string' && session.content.user_message.length > 80 ? '...' : ''}"
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t border-border/30">
                        <TelegramLearningAnalysis sessions={[session]} />
                        
                        {/* Debug section for developers */}
                        <details className="mt-4">
                          <summary className="text-xs text-muted-foreground cursor-pointer">Debug Session Data</summary>
                          <pre className="text-xs mt-1 p-2 bg-muted/20 rounded overflow-auto max-h-32">
                            {JSON.stringify({
                              id: session.id.substring(0, 8),
                              content_keys: Object.keys(session.content || {}),
                              progress_data_keys: Object.keys(session.progress_data || {}),
                              vocabulary_count: session.progress_data?.vocabulary_learned?.length || 0,
                              has_bot_response: !!(session.content?.bot_response)
                            }, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
