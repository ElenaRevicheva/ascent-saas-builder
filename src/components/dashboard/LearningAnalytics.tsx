import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Target, 
  Clock, 
  TrendingUp, 
  Star, 
  Flame,
  Brain,
  Calendar,
  Award,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

interface LearningStats {
  totalModulesCompleted: number;
  totalTimeSpent: number;
  vocabularyLearned: number;
  averageConfidence: number;
  currentStreak: number;
  longestStreak: number;
  recentAchievements: Achievement[];
  weeklyProgress: number[];
}

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_title: string;
  achievement_description: string;
  earned_at: string;
  badge_icon: string;
}

export const LearningAnalytics = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<LearningStats>({
    totalModulesCompleted: 0,
    totalTimeSpent: 0,
    vocabularyLearned: 0,
    averageConfidence: 0,
    currentStreak: 0,
    longestStreak: 0,
    recentAchievements: [],
    weeklyProgress: [0, 0, 0, 0, 0, 0, 0]
  });
  const [loading, setLoading] = useState(true);
  const [allSessionsData, setAllSessionsData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadLearningStats();
    }
  }, [user]);

  // Auto-refresh every 30 seconds to pick up new Telegram sessions
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        loadLearningStats();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [user]);

  const loadLearningStats = async () => {
    try {
      // Load module progress stats
      const { data: progressData, error: progressError } = await supabase
        .from('user_module_progress')
        .select('*')
        .eq('user_id', user?.id);

      if (progressError) throw progressError;

      // Load learning sessions (including Telegram conversations)
      const { data: allSessionsData, error: allSessionsError } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (allSessionsError) throw allSessionsError;

      // Load learning streaks
      const { data: streakData, error: streakError } = await supabase
        .from('learning_streaks')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      // Load recent achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user?.id)
        .order('earned_at', { ascending: false })
        .limit(5);

      // Load recent learning sessions for weekly progress
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('learning_sessions')
        .select('created_at')
        .eq('user_id', user?.id)
        .gte('created_at', oneWeekAgo.toISOString());

      // Calculate stats including learning sessions
      const completedModules = progressData?.filter(p => p.is_completed)?.length || 0;
      const moduleTimeSpent = progressData?.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0) || 0;
      const sessionTimeSpent = allSessionsData?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
      const totalTimeSpent = moduleTimeSpent + sessionTimeSpent;

      // Combine vocabulary from modules and sessions
      const moduleVocabulary = progressData?.flatMap(p => p.vocabulary_learned || []) || [];
      const sessionVocabulary = allSessionsData?.flatMap(s => {
        const progressData = s.progress_data as any;
        return progressData?.vocabulary_learned || [];
      }) || [];
      const allVocabulary = [...moduleVocabulary, ...sessionVocabulary];
      const uniqueVocabulary = [...new Set(allVocabulary)].length;

      const avgConfidence = progressData?.length 
        ? progressData.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / progressData.length 
        : 0;

      // Calculate weekly progress (sessions per day)
      const weeklyProgress = Array(7).fill(0);
      if (sessionsData) {
        sessionsData.forEach(session => {
          const sessionDate = new Date(session.created_at);
          const dayIndex = Math.floor((Date.now() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
          if (dayIndex >= 0 && dayIndex < 7) {
            weeklyProgress[6 - dayIndex]++;
          }
        });
      }

      setStats({
        totalModulesCompleted: completedModules,
        totalTimeSpent,
        vocabularyLearned: uniqueVocabulary,
        averageConfidence: avgConfidence,
        currentStreak: streakData?.current_streak || 0,
        longestStreak: streakData?.longest_streak || 0,
        recentAchievements: achievementsData || [],
        weeklyProgress
      });

      // Set sessions data for detailed view
      setAllSessionsData(allSessionsData || []);

    } catch (error) {
      console.error('Error loading learning stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '🔥';
    if (streak >= 14) return '⚡';
    if (streak >= 7) return '✨';
    if (streak >= 3) return '🌟';
    return '💫';
  };

  const getAchievementIcon = (iconName: string) => {
    const iconMap: {[key: string]: any} = {
      trophy: Trophy,
      star: Star,
      target: Target,
      fire: Flame,
      brain: Brain,
      award: Award,
      book: BookOpen
    };
    const IconComponent = iconMap[iconName] || Trophy;
    return <IconComponent className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Modules Completed</p>
                <p className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">
                  {stats.totalModulesCompleted}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-[hsl(var(--espaluz-secondary))]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Learning Streak</p>
                <p className="text-2xl font-bold text-[hsl(var(--espaluz-primary))] flex items-center gap-1">
                  {stats.currentStreak}
                  <span className="text-lg">{getStreakEmoji(stats.currentStreak)}</span>
                </p>
              </div>
              <Flame className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vocabulary Learned</p>
                <p className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">
                  {stats.vocabularyLearned}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-[hsl(var(--espaluz-secondary))]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">
                  {Math.round(stats.averageConfidence * 100)}%
                </p>
              </div>
              <Brain className="h-8 w-8 text-[hsl(var(--espaluz-secondary))]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Progress */}
        <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Learning Sessions This Week</span>
                <span className="font-medium">{stats.weeklyProgress.reduce((a, b) => a + b, 0)}</span>
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">{day}</div>
                    <div 
                      className="h-8 bg-muted rounded flex items-center justify-center text-xs font-medium"
                      style={{
                        backgroundColor: stats.weeklyProgress[index] > 0 
                          ? `hsl(var(--espaluz-primary) / ${Math.min(stats.weeklyProgress[index] * 0.3, 1)})` 
                          : undefined
                      }}
                    >
                      {stats.weeklyProgress[index] || ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Achievements */}
        <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
              Recent Achievements
              <Badge variant="secondary" className="ml-auto">
                {stats.recentAchievements.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentAchievements.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No achievements yet</p>
                  <p className="text-xs">Keep learning to earn your first badge!</p>
                </div>
              ) : (
                stats.recentAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--espaluz-primary))]/20 flex items-center justify-center">
                      {getAchievementIcon(achievement.badge_icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{achievement.achievement_title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {achievement.achievement_description}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(achievement.earned_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Learning Sessions */}
      <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
            Recent Learning Sessions
            <Badge variant="secondary" className="ml-auto">
              {allSessionsData?.length || 0} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allSessionsData && allSessionsData.length > 0 ? (
              allSessionsData.slice(0, 5).map((session) => {
                const progressData = session.progress_data as any;
                const vocabularyLearned = progressData?.vocabulary_learned || [];
                const content = session.content as any;
                
                return (
                  <div key={session.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {session.source === 'telegram' ? (
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-green-500" />
                        )}
                        <span className="font-medium text-sm">
                          {session.source === 'telegram' ? 'Telegram Chat' : 'Learning Module'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {session.session_type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {vocabularyLearned.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Vocabulary learned:</p>
                        <div className="flex flex-wrap gap-1">
                          {vocabularyLearned.map((word: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {word}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {content?.message && (
                      <div className="text-sm text-muted-foreground italic">
                        "{content.message.substring(0, 100)}{content.message.length > 100 ? '...' : ''}"
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {session.duration_minutes && (
                        <span>Duration: {session.duration_minutes} min</span>
                      )}
                      {progressData?.spanish_words_total && (
                        <span>Spanish words: {progressData.spanish_words_total}</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No learning sessions found. Start chatting with your Telegram bot!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};