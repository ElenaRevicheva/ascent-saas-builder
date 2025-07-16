import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, BookOpen, Clock, Trophy, TrendingUp, Star, Brain, Zap } from 'lucide-react';
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

  const getEnhancedStats = () => {
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    
    // Extract vocabulary and analyze complexity
    const allVocabulary = sessions.flatMap(s => s.progress_data?.vocabulary_learned || []);
    const uniqueVocabulary = [...new Set(allVocabulary)];
    
    // Enhanced phrase extraction with categories
    const spanishPhrases: string[] = [];
    const greetings: string[] = [];
    const foodTerms: string[] = [];
    const familyTerms: string[] = [];
    const cookingTerms: string[] = [];
    const emotions: string[] = [];
    
    // Topic analysis from user messages
    const userTopics: string[] = [];
    
    sessions.forEach(session => {
      const botResponse = session.content?.bot_response || '';
      const userMessage = session.content?.user_message || '';
      
      // Analyze user topics
      if (userMessage.toLowerCase().includes('мама') || userMessage.includes('family')) {
        userTopics.push('Family Conversations');
      }
      if (userMessage.toLowerCase().includes('готовить') || userMessage.includes('cook')) {
        userTopics.push('Cooking & Food');
      }
      if (userMessage.toLowerCase().includes('тревож') || userMessage.includes('worry')) {
        userTopics.push('Emotions & Feelings');
      }
      
      // Enhanced phrase extraction
      const extractPhrases = (text: string, regex: RegExp, processor: (match: string) => string) => {
        const matches = text.match(regex);
        if (matches) {
          matches.forEach((match: string) => {
            const phrase = processor(match).trim();
            if (phrase.length > 2) {
              spanishPhrases.push(phrase);
              
              // Categorize phrases
              if (phrase.toLowerCase().includes('hola') || phrase.toLowerCase().includes('buenos')) {
                greetings.push(phrase);
              } else if (phrase.toLowerCase().includes('comida') || phrase.toLowerCase().includes('cocinar') || 
                        phrase.toLowerCase().includes('espaguetis') || phrase.toLowerCase().includes('ajo')) {
                foodTerms.push(phrase);
              } else if (phrase.toLowerCase().includes('familia') || phrase.toLowerCase().includes('madre') || 
                        phrase.toLowerCase().includes('padre')) {
                familyTerms.push(phrase);
              } else if (phrase.toLowerCase().includes('cocinar') || phrase.toLowerCase().includes('preparar') || 
                        phrase.toLowerCase().includes('aceite')) {
                cookingTerms.push(phrase);
              } else if (phrase.toLowerCase().includes('respeto') || phrase.toLowerCase().includes('amor') || 
                        phrase.toLowerCase().includes('tranquil')) {
                emotions.push(phrase);
              }
            }
          });
        }
      };
      
      // Multiple extraction patterns
      extractPhrases(botResponse, /\*\*([^*]+)\*\*/g, (match) => match.replace(/\*\*/g, ''));
      extractPhrases(botResponse, /"([^"]+)"/g, (match) => match.replace(/"/g, ''));
      extractPhrases(botResponse, /- ([^\n]+)/g, (match) => match.replace(/^- /, ''));
      extractPhrases(botResponse, /\b[A-Z][a-z]+ [a-z]+\b/g, (match) => match);
      extractPhrases(botResponse, /\([^)]+\)/g, (match) => match.replace(/[()]/g, ''));
    });
    
    const uniquePhrases = [...new Set(spanishPhrases)].slice(0, 15);
    const uniqueTopics = [...new Set(userTopics)];
    
    // Calculate learning insights
    const avgSessionLength = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    const vocabularyDiversity = uniqueVocabulary.length + uniquePhrases.length;
    const learningScore = Math.min(100, Math.round((vocabularyDiversity * 10) + (totalSessions * 5)));
    
    return {
      totalSessions,
      totalMinutes,
      vocabularyCount: uniqueVocabulary.length,
      uniqueVocabulary,
      phrases: uniquePhrases,
      categories: {
        greetings: [...new Set(greetings)],
        food: [...new Set(foodTerms)],
        family: [...new Set(familyTerms)],
        cooking: [...new Set(cookingTerms)],
        emotions: [...new Set(emotions)]
      },
      topics: uniqueTopics,
      insights: {
        avgSessionLength,
        vocabularyDiversity,
        learningScore,
        mostActiveDay: sessions.length > 0 ? new Date(sessions[0].created_at).toLocaleDateString() : null,
        streak: Math.min(7, totalSessions) // Simple streak calculation
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
      {/* Header Card with Learning Score */}
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
            <div className="text-right">
              <div className="text-3xl font-bold text-[hsl(var(--espaluz-primary))]">{stats.insights.learningScore}</div>
              <div className="text-xs text-muted-foreground">Learning Score</div>
              <Progress value={stats.insights.learningScore} className="w-16 h-2 mt-1" />
            </div>
          </div>
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
                <div className="text-xs text-blue-600 mt-1">🔥 {stats.insights.streak} day streak</div>
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

      {/* Categorized Spanish Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spanish Phrases by Category */}
        <Card className="border-border/50 shadow-magical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
              Spanish Phrases by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.categories).map(([category, phrases]) => 
              phrases.length > 0 && (
                <div key={category}>
                  <h5 className="font-medium mb-2 text-sm capitalize flex items-center gap-2">
                    {category === 'food' && '🍽️'}
                    {category === 'family' && '👨‍👩‍👧‍👦'}
                    {category === 'cooking' && '👨‍🍳'}
                    {category === 'emotions' && '❤️'}
                    {category === 'greetings' && '👋'}
                    {category} ({phrases.length})
                  </h5>
                  <div className="grid gap-2">
                    {phrases.slice(0, 3).map((phrase, index) => (
                      <div 
                        key={index} 
                        className="p-3 bg-gradient-to-r from-[hsl(var(--espaluz-primary))]/10 to-[hsl(var(--espaluz-primary))]/5 border border-[hsl(var(--espaluz-primary))]/20 rounded-lg hover-scale transition-all duration-200"
                      >
                        <span className="text-[hsl(var(--espaluz-primary))] font-medium">{phrase}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
            
            {/* All phrases if no categories */}
            {Object.values(stats.categories).every(cat => cat.length === 0) && stats.phrases.length > 0 && (
              <div>
                <h5 className="font-medium mb-3 text-sm">All Spanish Phrases</h5>
                <div className="grid gap-2">
                  {stats.phrases.slice(0, 8).map((phrase, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-gradient-to-r from-[hsl(var(--espaluz-primary))]/10 to-[hsl(var(--espaluz-primary))]/5 border border-[hsl(var(--espaluz-primary))]/20 rounded-lg hover-scale transition-all duration-200"
                    >
                      <span className="text-[hsl(var(--espaluz-primary))] font-medium">{phrase}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vocabulary & Recent Sessions */}
        <Card className="border-border/50 shadow-magical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Vocabulary & Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enhanced Vocabulary */}
            {stats.uniqueVocabulary.length > 0 && (
              <div>
                <h5 className="font-medium mb-3 text-sm">Individual Words Mastered</h5>
                <div className="flex flex-wrap gap-2">
                  {stats.uniqueVocabulary.map((word, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-sm px-3 py-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-700 dark:text-yellow-300 hover-scale"
                    >
                      {word}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Recent Sessions */}
            {sessions.length > 0 && (
              <div>
                <h5 className="font-medium mb-3 text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Conversations
                </h5>
                <div className="space-y-3">
                  {sessions.slice(0, 2).map((session) => (
                    <div key={session.id} className="p-4 bg-gradient-to-r from-background/80 to-background/40 border border-border/50 rounded-lg hover-scale transition-all duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">
                            {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/20">
                          {session.duration_minutes || 1}min chat
                        </Badge>
                      </div>
                      
                      {session.content?.user_message && (
                        <div className="text-sm text-muted-foreground mb-3 p-2 bg-muted/30 rounded-md italic border-l-2 border-[hsl(var(--espaluz-primary))]/30">
                          "{session.content.user_message.substring(0, 100)}..."
                        </div>
                      )}
                      
                      {session.progress_data?.vocabulary_learned?.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Words learned:</div>
                          <div className="flex flex-wrap gap-1">
                            {session.progress_data.vocabulary_learned.slice(0, 4).map((word: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs bg-[hsl(var(--espaluz-primary))]/10 border-[hsl(var(--espaluz-primary))]/20">
                                {word}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
          </CardContent>
        </Card>
      )}
    </div>
  );
};