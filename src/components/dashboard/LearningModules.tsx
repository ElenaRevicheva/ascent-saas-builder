
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
import { loadCountryLessons } from '@/data/countryLessons';
import { readFamilyProfile, PACK_COUNTRIES } from './FamilyProfileDialog';

export const LearningModules = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [userProgress, setUserProgress] = useState<Record<string, { progress: number; isCompleted: boolean }>>({});
  const [loading, setLoading] = useState(true);
  // 15 Nov 2026 (Elena: "these features should be present but serve the goals"): the family's own country lessons
  // from the checked guide come first in every level; the five original lessons stay below them.
  const [countryLessons, setCountryLessons] = useState<Lesson[]>([]);
  const [countryName, setCountryName] = useState('');
  useEffect(() => {
    if (!user) return;
    readFamilyProfile(user.id).then(async (p) => {
      const c = String(p?.country_now ?? '');
      if (!PACK_COUNTRIES.some(([k]) => k === c)) return;
      setCountryName(PACK_COUNTRIES.find(([k]) => k === c)?.[1] ?? '');
      setCountryLessons(await loadCountryLessons(c));
    }).catch(() => undefined);
  }, [user]);

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

  const filteredLessons = [...countryLessons, ...spanishLessons].filter(lesson => lesson.difficulty === selectedDifficulty);

  const startLesson = (lesson: Lesson) => {
    // 15 Nov 2026: the page lives at /learning/:moduleId - "/learning-module/" opened "page not found" for every lesson.
    navigate(`/learning/${lesson.id}`);
  };

  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          Spanish Learning Modules
        </CardTitle>
        {countryName && (
          <p className="text-sm text-muted-foreground">Living in {countryName}: lessons from your checked country guide come first, then Spanish basics.</p>
        )}
        
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
                      {/* bg-muted: the shared bar's track is the brand magenta, so an empty bar looked full */}
                      <Progress 
                        value={userProgress[lesson.id]?.progress || 0} 
                        className="flex-1 h-2 bg-muted" 
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
          {filteredLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {countryName ? 'No lessons at this level yet.' : 'Tell EspaLuz where home is now (the family map, "About your new life") and your country lessons appear here.'}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {countryName ? `Every ${countryName} card is a checked fact from your country guide - the same one EspaLuz uses on WhatsApp and Telegram.` : 'Tell EspaLuz where home is now and your country lessons appear here.'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
