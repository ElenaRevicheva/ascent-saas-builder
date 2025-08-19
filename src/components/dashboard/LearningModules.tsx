
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Clock, 
  Star, 
  Play,
  CheckCircle2,
  Trophy,
  Brain,
  MessageSquare,
  Globe
} from 'lucide-react';
import { spanishLessons, Lesson } from '@/data/spanishLessons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const LearningModules = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [userProgress, setUserProgress] = useState<Record<string, { progress: number; isCompleted: boolean }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserProgress = async () => {
      try {
        const { data: progressData } = await supabase
          .from('user_module_progress')
          .select('module_id, progress_percentage, is_completed')
          .eq('user_id', user.id);

        const progressMap: Record<string, { progress: number; isCompleted: boolean }> = {};
        progressData?.forEach(p => {
          progressMap[p.module_id] = {
            progress: p.progress_percentage,
            isCompleted: p.is_completed
          };
        });

        setUserProgress(progressMap);
      } catch (error) {
        console.error('Error fetching user progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProgress();
  }, [user]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vocabulary': return <BookOpen className="h-4 w-4" />;
      case 'grammar': return <Brain className="h-4 w-4" />;
      case 'conversation': return <MessageSquare className="h-4 w-4" />;
      case 'culture': return <Globe className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500 text-white';
      case 'intermediate': return 'bg-yellow-500 text-white';
      case 'advanced': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const filteredLessons = spanishLessons.filter(lesson => lesson.difficulty === selectedDifficulty);

  const startLesson = (lesson: Lesson) => {
    // For now, create a simple module ID from lesson ID
    navigate(`/learning-module/${lesson.id}`);
  };

  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          Spanish Learning Modules
        </CardTitle>
        
        {/* Difficulty Filter */}
        <div className="flex gap-2 mt-4">
          {(['beginner', 'intermediate', 'advanced'] as const).map((difficulty) => (
            <Button
              key={difficulty}
              variant={selectedDifficulty === difficulty ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDifficulty(difficulty)}
              className={selectedDifficulty === difficulty ? "bg-[hsl(var(--espaluz-primary))]" : ""}
            >
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {filteredLessons.map((lesson, index) => (
          <div key={lesson.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getCategoryIcon(lesson.category)}
                  <h3 className="font-semibold">{lesson.title}</h3>
                  <Badge 
                    variant="outline" 
                    className={`${getDifficultyColor(lesson.difficulty)} border-0`}
                  >
                    {lesson.difficulty}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {lesson.description}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{lesson.estimatedMinutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    <span>{lesson.vocabulary.length} words</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{lesson.phrases.length} phrases</span>
                  </div>
                </div>

                {/* Sample vocabulary preview */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {lesson.vocabulary.slice(0, 5).map((word, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {word}
                    </Badge>
                  ))}
                  {lesson.vocabulary.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{lesson.vocabulary.length - 5} more
                    </Badge>
                  )}
                </div>
                
                {/* Real user progress from database */}
                <div className="flex items-center gap-2 mb-3">
                  {loading ? (
                    <div className="flex-1 h-2 bg-muted rounded-full animate-pulse"></div>
                  ) : (
                    <>
                      <Progress 
                        value={userProgress[lesson.id]?.progress || 0} 
                        className="flex-1 h-2" 
                      />
                      <span className="text-xs text-muted-foreground">
                        {userProgress[lesson.id]?.isCompleted 
                          ? 'Complete' 
                          : userProgress[lesson.id]?.progress 
                          ? `${userProgress[lesson.id].progress}%` 
                          : 'Not started'}
                      </span>
                      {userProgress[lesson.id]?.isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </>
                  )}
                </div>
              </div>
              
              <Button
                onClick={() => startLesson(lesson)}
                size="sm"
                className="bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
              >
                <Play className="h-4 w-4 mr-1" />
                {userProgress[lesson.id]?.isCompleted 
                  ? 'Review' 
                  : userProgress[lesson.id]?.progress 
                  ? 'Continue' 
                  : 'Start'}
              </Button>
            </div>
          </div>
        ))}
        
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Master the basics to unlock intermediate lessons
          </p>
          <Button variant="outline" size="sm" disabled>
            <Trophy className="h-4 w-4 mr-2" />
            More lessons coming soon
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
