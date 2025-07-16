import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  Star, 
  PlayCircle,
  CheckCircle2,
  Lock,
  Target,
  Brain
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface LearningModule {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  category: string;
  lesson_content: any;
  estimated_duration_minutes: number;
  order_index: number;
}

interface ModuleProgress {
  module_id: string;
  progress_percentage: number;
  is_completed: boolean;
  time_spent_minutes: number;
  vocabulary_learned: string[];
  confidence_score: number;
}

export const LearningModules = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [userProgress, setUserProgress] = useState<{[key: string]: ModuleProgress}>({});
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);

  useEffect(() => {
    if (user) {
      loadModulesAndProgress();
    }
  }, [user]);

  // Auto-refresh every 30 seconds to pick up new Telegram sessions
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        loadModulesAndProgress();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [user]);

  const loadModulesAndProgress = async () => {
    try {
      // Load learning modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('learning_modules')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (modulesError) throw modulesError;

      // Load user module progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_module_progress')
        .select('*')
        .eq('user_id', user?.id);

      if (progressError) throw progressError;

      // Load learning sessions to calculate additional progress
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      setModules(modulesData || []);
      
      // Convert progress array to object and enhance with session data
      const progressMap: {[key: string]: ModuleProgress} = {};
      
      // First, add existing module progress
      progressData?.forEach(progress => {
        progressMap[progress.module_id] = progress;
      });

      // Calculate progress from learning sessions for each module
      modulesData?.forEach(module => {
        const moduleVocabulary = (module.lesson_content as any)?.vocabulary || [];
        
        const relatedSessions = sessionsData?.filter(session => {
          if (session.source !== 'telegram') return false;
          const sessionVocab = (session.progress_data as any)?.vocabulary_learned || [];
          
          // Direct vocabulary match
          return sessionVocab.some((sessionWord: string) => 
            moduleVocabulary.some((moduleWord: string) => 
              sessionWord.toLowerCase() === moduleWord.toLowerCase()
            )
          );
        }) || [];

        if (relatedSessions.length > 0) {
          const existingProgress = progressMap[module.id];
          const sessionVocabulary = relatedSessions.flatMap(session => 
            (session.progress_data as any)?.vocabulary_learned || []
          );
          const sessionTimeSpent = relatedSessions.reduce((total, session) => 
            total + (session.duration_minutes || 0), 0
          );
          
          // Count matched vocabulary
          const matchedWords = sessionVocabulary.filter(sessionWord =>
            moduleVocabulary.some(moduleWord => 
              sessionWord.toLowerCase() === moduleWord.toLowerCase()
            )
          );
          
          const uniqueMatchedWords = [...new Set(matchedWords)];
          const moduleVocabCount = moduleVocabulary.length;
          const progressPercentage = Math.min(
            Math.round((uniqueMatchedWords.length / moduleVocabCount) * 100), 
            100
          );

          if (!existingProgress) {
            progressMap[module.id] = {
              module_id: module.id,
              progress_percentage: progressPercentage,
              is_completed: progressPercentage >= 80,
              time_spent_minutes: sessionTimeSpent,
              vocabulary_learned: uniqueMatchedWords,
              confidence_score: 0.7
            };
          } else {
            const combinedVocab = [...new Set([
              ...(existingProgress.vocabulary_learned || []),
              ...uniqueMatchedWords
            ])];
            const combinedTime = (existingProgress.time_spent_minutes || 0) + sessionTimeSpent;
            const newProgress = Math.max(existingProgress.progress_percentage, progressPercentage);

            progressMap[module.id] = {
              ...existingProgress,
              progress_percentage: newProgress,
              is_completed: newProgress >= 80 || existingProgress.is_completed,
              time_spent_minutes: combinedTime,
              vocabulary_learned: combinedVocab,
              confidence_score: Math.max(existingProgress.confidence_score || 0, 0.7)
            };
          }
        }
      });

      setUserProgress(progressMap);

    } catch (error) {
      console.error('Error loading modules:', error);
      toast.error('Failed to load learning modules');
    } finally {
      setLoading(false);
    }
  };

  const startModule = async (module: LearningModule) => {
    // Navigate to the learning module page
    navigate(`/learning/${module.id}`);
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vocabulary': return <BookOpen className="h-4 w-4" />;
      case 'conversation': return <Brain className="h-4 w-4" />;
      case 'grammar': return <Target className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const isModuleUnlocked = (module: LearningModule, index: number) => {
    if (index === 0) return true; // First module is always unlocked
    
    const previousModule = modules[index - 1];
    if (!previousModule) return true;
    
    const previousProgress = userProgress[previousModule.id];
    return previousProgress?.is_completed || false;
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

  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          Learning Modules
          <Badge variant="secondary" className="ml-auto">
            {modules.filter(m => userProgress[m.id]?.is_completed).length}/{modules.length} Complete
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <ScrollArea className="h-96">
          <div className="space-y-4 pr-4">
            {modules.map((module, index) => {
              const progress = userProgress[module.id];
              const isUnlocked = isModuleUnlocked(module, index);
              const isCompleted = progress?.is_completed || false;
              const progressPercentage = progress?.progress_percentage || 0;

              return (
                <div
                  key={module.id}
                  className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                    isUnlocked ? 'bg-background/50 border-border cursor-pointer' : 'bg-muted/30 border-muted'
                  }`}
                  onClick={() => isUnlocked && startModule(module)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(module.category)}
                      <h3 className={`font-medium ${!isUnlocked ? 'text-muted-foreground' : ''}`}>
                        {module.title}
                      </h3>
                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {!isUnlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getDifficultyColor(module.difficulty_level)} text-white border-0`}
                      >
                        {module.difficulty_level}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {module.estimated_duration_minutes}m
                      </Badge>
                    </div>
                  </div>

                  <p className={`text-sm mb-3 ${!isUnlocked ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                    {module.description}
                  </p>

                  {isUnlocked && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Progress</span>
                        <span className="text-xs font-medium">{progressPercentage}%</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2 mb-3" />
                      
                      {progress && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {progress.vocabulary_learned?.length || 0} words
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {progress.time_spent_minutes || 0}m spent
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {Math.round((progress.confidence_score || 0) * 100)}% confidence
                          </span>
                        </div>
                      )}

                      <Button
                        size="sm"
                        className="w-full mt-3 bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
                        disabled={!isUnlocked}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        {isCompleted ? 'Review Module' : 'Start Learning'}
                      </Button>
                    </>
                  )}

                  {!isUnlocked && (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <Lock className="h-4 w-4 mr-2" />
                      <span className="text-sm">Complete previous modules to unlock</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};