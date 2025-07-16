import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Trophy,
  Brain,
  Target,
  Star
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { supabase } from '@/integrations/supabase/client';
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

export default function LearningModulePage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackProgress } = useLearningProgress();
  
  const [module, setModule] = useState<LearningModule | null>(null);
  const [progress, setProgress] = useState<ModuleProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionStartTime] = useState(Date.now());

  useEffect(() => {
    if (user && moduleId) {
      loadModuleData();
    }
  }, [user, moduleId]);

  const loadModuleData = async () => {
    try {
      // Load module details
      const { data: moduleData, error: moduleError } = await supabase
        .from('learning_modules')
        .select('*')
        .eq('id', moduleId)
        .single();

      if (moduleError) throw moduleError;

      // Load user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_module_progress')
        .select('*')
        .eq('user_id', user?.id)
        .eq('module_id', moduleId)
        .maybeSingle();

      // Load related learning sessions to calculate existing progress
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', user?.id);

      if (sessionsError) throw sessionsError;

      setModule(moduleData);

      // Calculate progress from sessions if no formal progress exists
      const moduleVocabulary = (moduleData.lesson_content as any)?.vocabulary || [];
      const relatedSessions = sessionsData?.filter(session => {
        const sessionContent = session.content as any;
        const sessionVocab = (session.progress_data as any)?.vocabulary_learned || [];
        
        // Check if session vocabulary matches module vocabulary
        const vocabMatch = sessionVocab.some((word: string) => 
          moduleVocabulary.some((moduleWord: string) => 
            moduleWord.toLowerCase().includes(word.toLowerCase()) ||
            word.toLowerCase().includes(moduleWord.toLowerCase())
          )
        );
        
        return vocabMatch;
      }) || [];

      if (!progressData && relatedSessions.length > 0) {
        // Create initial progress based on existing sessions
        const sessionVocabulary = relatedSessions.flatMap(session => 
          (session.progress_data as any)?.vocabulary_learned || []
        );
        const sessionTimeSpent = relatedSessions.reduce((total, session) => 
          total + (session.duration_minutes || 0), 0
        );
        
        const uniqueSessionVocab = [...new Set(sessionVocabulary)];
        const sessionProgressPercentage = Math.min(
          Math.round((uniqueSessionVocab.length / Math.max(moduleVocabulary.length, 1)) * 100), 
          100
        );

        const calculatedProgress = {
          module_id: moduleId as string,
          progress_percentage: sessionProgressPercentage,
          is_completed: sessionProgressPercentage >= 80,
          time_spent_minutes: sessionTimeSpent,
          vocabulary_learned: uniqueSessionVocab,
          confidence_score: 0.7
        };

        setProgress(calculatedProgress);
        setCurrentStep(Math.floor((sessionProgressPercentage / 100) * 3)); // Assume 3 steps per module
      } else {
        setProgress(progressData);
      }
      
      // If no progress exists at all, create initial progress
      if (!progressData && relatedSessions.length === 0) {
        const { error: createError } = await supabase
          .from('user_module_progress')
          .insert({
            user_id: user?.id,
            module_id: moduleId,
            progress_percentage: 0,
            is_completed: false
          });
        
        if (createError) throw createError;
      }

    } catch (error) {
      console.error('Error loading module:', error);
      toast.error('Failed to load learning module');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const completeStep = async () => {
    if (!module || !user) return;

    const lessonContent = module.lesson_content as any;
    const totalSteps = lessonContent?.steps?.length || 1;
    const newStep = Math.min(currentStep + 1, totalSteps);
    const newProgress = Math.round((newStep / totalSteps) * 100);
    const timeSpent = Math.round((Date.now() - sessionStartTime) / 60000); // minutes
    const isCompleted = newStep >= totalSteps;

    // Simulate vocabulary learning
    const vocabularyLearned = lessonContent?.vocabulary || ['hola', 'gracias', 'por favor'];
    
    try {
      // Update progress in database
      const { error } = await supabase
        .from('user_module_progress')
        .update({
          progress_percentage: newProgress,
          is_completed: isCompleted,
          time_spent_minutes: timeSpent,
          vocabulary_learned: vocabularyLearned,
          confidence_score: 0.8 // Simulate confidence score
        })
        .eq('user_id', user.id)
        .eq('module_id', module.id);

      if (error) throw error;

      // Track learning progress
      await trackProgress(module.id, {
        progressPercentage: newProgress,
        isCompleted: isCompleted,
        timeSpentMinutes: timeSpent,
        vocabularyLearned: vocabularyLearned,
        confidenceScore: 0.8
      });

      setCurrentStep(newStep);
      setProgress(prev => prev ? {
        ...prev,
        progress_percentage: newProgress,
        is_completed: isCompleted,
        time_spent_minutes: timeSpent,
        vocabulary_learned: vocabularyLearned,
        confidence_score: 0.8
      } : null);

      if (isCompleted) {
        toast.success('Congratulations! Module completed!');
      } else {
        toast.success('Great progress! Keep going!');
      }

    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to save progress');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vocabulary': return <BookOpen className="h-5 w-5" />;
      case 'conversation': return <Brain className="h-5 w-5" />;
      case 'grammar': return <Target className="h-5 w-5" />;
      default: return <Star className="h-5 w-5" />;
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--espaluz-primary))]"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Module not found</h1>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const lessonContent = module.lesson_content as any;
  const totalSteps = lessonContent?.steps?.length || 3;
  const currentProgressPercentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <div className="flex items-center gap-2">
                {getCategoryIcon(module.category)}
                <h1 className="text-xl font-bold">{module.title}</h1>
                <Badge 
                  variant="outline" 
                  className={`${getDifficultyColor(module.difficulty_level)} text-white border-0`}
                >
                  {module.difficulty_level}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                <Clock className="h-4 w-4 inline mr-1" />
                {module.estimated_duration_minutes}min
              </div>
              <div className="text-sm font-medium">
                {progress?.progress_percentage || 0}% Complete
              </div>
            </div>
          </div>
          
          <Progress 
            value={progress?.progress_percentage || 0} 
            className="mt-4" 
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Step {currentStep + 1} of {totalSteps}</span>
                {progress?.is_completed && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Completed
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Module Description */}
              <div className="text-lg text-muted-foreground">
                {module.description}
              </div>

              {/* Learning Content */}
              <div className="bg-background/50 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold">
                  {lessonContent?.steps?.[currentStep]?.title || `Learning Step ${currentStep + 1}`}
                </h3>
                
                <div className="text-muted-foreground">
                  {lessonContent?.steps?.[currentStep]?.content || 
                   `This is step ${currentStep + 1} of the ${module.title} module. Practice the vocabulary and concepts presented in this lesson.`}
                </div>

                {/* Sample vocabulary for this step */}
                <div className="space-y-2">
                  <h4 className="font-medium">Key Vocabulary:</h4>
                  <div className="flex flex-wrap gap-2">
                    {(lessonContent?.vocabulary || ['hola', 'gracias', 'por favor', 'buenos días']).map((word: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                >
                  Previous Step
                </Button>
                
                <Button
                  onClick={completeStep}
                  disabled={currentStep >= totalSteps}
                  className="bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
                >
                  {currentStep >= totalSteps - 1 ? 'Complete Module' : 'Next Step'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress Summary */}
          {progress && (
            <Card className="mt-6 border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">
                      {progress.vocabulary_learned?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Words Learned</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">
                      {progress.time_spent_minutes || 0}m
                    </p>
                    <p className="text-sm text-muted-foreground">Time Spent</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">
                      {Math.round((progress.confidence_score || 0) * 100)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}