
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
  const [stats, setStats] = useState<LearningStats>({
    totalLessonsCompleted: 3,
    totalTimeSpent: 125,
    currentStreak: 5,
    vocabularyLearned: 47,
    weeklyProgress: 75,
    averageScore: 87
  });
  const [loading, setLoading] = useState(false);

  // Use mock data for now to avoid fetch errors
  useEffect(() => {
    if (!user) return;
    
    console.log('Loading learning analytics for user:', user.id);
    
    // Simulate some realistic progress data
    const mockStats = {
      totalLessonsCompleted: Math.floor(Math.random() * 10) + 1,
      totalTimeSpent: Math.floor(Math.random() * 200) + 50,
      currentStreak: Math.floor(Math.random() * 14) + 1,
      vocabularyLearned: Math.floor(Math.random() * 100) + 20,
      weeklyProgress: Math.floor(Math.random() * 40) + 60,
      averageScore: Math.floor(Math.random() * 20) + 80
    };
    
    setStats(mockStats);
    setLoading(false);
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
          Your Learning Journey
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
            <p className="text-sm text-muted-foreground">Lessons Completed</p>
          </div>
          
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-500">
              {stats.totalTimeSpent}m
            </p>
            <p className="text-sm text-muted-foreground">Time Spent</p>
          </div>
          
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-500">
              {stats.currentStreak}
            </p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </div>
          
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Star className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-500">
              {stats.vocabularyLearned}
            </p>
            <p className="text-sm text-muted-foreground">Words Learned</p>
          </div>
        </div>

        {/* Progress Sections */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Weekly Progress</span>
              <Badge variant="outline">{stats.weeklyProgress}%</Badge>
            </div>
            <Progress value={stats.weeklyProgress} className="h-2" />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Average Score</span>
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
            <span className="font-medium text-[hsl(var(--espaluz-primary))]">Latest Achievement</span>
          </div>
          <p className="text-sm text-muted-foreground">
            🎉 ¡Excelente! You've completed your first lesson!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
