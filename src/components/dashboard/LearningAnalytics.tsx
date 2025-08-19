
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  Clock, 
  Star, 
  Target,
  BookOpen,
  Trophy,
  Calendar,
  Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LearningStats {
  totalLessonsCompleted: number;
  totalTimeSpent: number;
  currentStreak: number;
  vocabularyLearned: number;
  weeklyProgress: number;
  averageScore: number;
}

export const LearningAnalytics = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<LearningStats>({
    totalLessonsCompleted: 0,
    totalTimeSpent: 0,
    currentStreak: 0,
    vocabularyLearned: 0,
    weeklyProgress: 0,
    averageScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchUserLearningStats = async () => {
      setLoading(true);
      try {
        console.log('Loading learning analytics for user:', user.id);
        
        // Fetch actual user progress from database
        const { data: moduleProgress } = await supabase
          .from('user_module_progress')
          .select('*')
          .eq('user_id', user.id);

        const { data: learningSessions } = await supabase
          .from('learning_sessions')
          .select('*')
          .eq('user_id', user.id);

        const { data: learningStreak } = await supabase
          .from('learning_streaks')
          .select('current_streak')
          .eq('user_id', user.id)
          .maybeSingle();

        // Calculate stats from actual data
        const totalLessonsCompleted = moduleProgress?.filter(p => p.is_completed).length || 0;
        const totalTimeSpent = moduleProgress?.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0) || 0;
        const currentStreak = learningStreak?.current_streak || 0;
        const vocabularyLearned = moduleProgress?.reduce((sum, p) => sum + (p.vocabulary_learned?.length || 0), 0) || 0;
        
        // Calculate weekly progress based on recent sessions
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentSessions = learningSessions?.filter(s => new Date(s.created_at) >= oneWeekAgo) || [];
        const weeklyProgress = Math.min((recentSessions.length * 20), 100); // Cap at 100%
        
        // Calculate average score from module progress
        const completedModules = moduleProgress?.filter(p => p.confidence_score && p.confidence_score > 0) || [];
        const averageScore = completedModules.length > 0 
          ? Math.round(completedModules.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / completedModules.length * 100)
          : 0;

        setStats({
          totalLessonsCompleted,
          totalTimeSpent,
          currentStreak,
          vocabularyLearned,
          weeklyProgress,
          averageScore
        });
      } catch (error) {
        console.error('Error fetching learning stats:', error);
        // Keep initial zero values on error
      } finally {
        setLoading(false);
      }
    };

    fetchUserLearningStats();
  }, [user]);

  if (loading) {
    return (
      <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
            Learning Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          {t('learningAnalysis.yourLearningJourney')}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Main Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <BookOpen className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">
              {stats.totalLessonsCompleted}
            </p>
            <p className="text-sm text-muted-foreground">{t('learningAnalysis.lessonsCompleted') || 'Lessons Completed'}</p>
          </div>
          
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-500">
              {stats.totalTimeSpent}m
            </p>
            <p className="text-sm text-muted-foreground">{t('learningAnalysis.timeSpent')}</p>
          </div>
          
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-500">
              {stats.currentStreak}
            </p>
            <p className="text-sm text-muted-foreground">{t('learningAnalysis.dayStreak')}</p>
          </div>
          
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Star className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-500">
              {stats.vocabularyLearned}
            </p>
            <p className="text-sm text-muted-foreground">{t('learningAnalysis.wordsLearned')}</p>
          </div>
        </div>

        {/* Progress Sections */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('learningAnalysis.weeklyProgress')}</span>
              <Badge variant="outline">{stats.weeklyProgress}%</Badge>
            </div>
            <Progress value={stats.weeklyProgress} className="h-2" />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('learningAnalysis.averageScore')}</span>
              <Badge variant="outline" className="bg-green-500 text-white">
                {stats.averageScore}%
              </Badge>
            </div>
            <Progress value={stats.averageScore} className="h-2" />
          </div>
        </div>

        {/* Achievements Preview */}
        <div className="mt-6 p-4 bg-gradient-to-r from-[hsl(var(--espaluz-primary))]/10 to-purple-500/10 rounded-lg border border-[hsl(var(--espaluz-primary))]/20">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-[hsl(var(--espaluz-primary))]" />
            <span className="font-medium text-[hsl(var(--espaluz-primary))]">{t('learningAnalysis.latestAchievement')}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {stats.totalLessonsCompleted > 0 
              ? "🎉 ¡Excelente! You've completed your first lesson!" 
              : "Ready to start your Spanish learning journey! 🚀"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
