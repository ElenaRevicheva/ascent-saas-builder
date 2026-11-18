
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
import { spanishLessons, Lesson, lessonTitle, lessonDescription } from '@/data/spanishLessons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { loadCountryLessons } from '@/data/countryLessons';
import { readFamilyProfile, PACK_COUNTRIES, settlesProfile } from './FamilyProfileDialog';

export const LearningModules = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [userProgress, setUserProgress] = useState<Record<string, { progress: number; isCompleted: boolean }>>({});
  const [loading, setLoading] = useState(true);
  // 15 Nov 2026 (Elena: "these features should be present but serve the goals"): the family's own country lessons
  // from the checked guide come first in every level; the five original lessons stay below them.
  const [countryLessons, setCountryLessons] = useState<Lesson[]>([]);
  const [countryName, setCountryName] = useState('');
  const [countryKey, setCountryKey] = useState('');
  const [settling, setSettling] = useState(false);
  useEffect(() => {
    if (!user) return;
    readFamilyProfile(user.id).then(async (p) => {
      setSettling(settlesProfile(p));
      const c = String(p?.country_now ?? '');
      if (!PACK_COUNTRIES.some(([k]) => k === c)) return;
      setCountryName(PACK_COUNTRIES.find(([k]) => k === c)?.[1] ?? '');
      setCountryKey(c);
      setCountryLessons(await loadCountryLessons(c, i18n.language));
    }).catch(() => undefined);
  }, [user, i18n.language]);

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

  // 18 Nov 2026: a family that already speaks Spanish gets its country lessons only - never the beginner Spanish ones.
  // 18 Nov 2026 (professional reader Carlos, native Spanish speaker: "Principiante + 'Buenos días' treats me as a learner"):
  // the guide's levels mean how long a family has been here, not Spanish level. A settling family sees ALL its country
  // lessons in one list, no level tabs, no badge - the most useful for a native speaker first, greetings last.
  const SETTLE_ORDER = ['local_expressions', 'time', 'newcomers_find_hard', 'school_life', 'family_and_friends', 'rhythm_of_the_year', 'folk_culture', 'everyday_life', 'food_and_table', 'greetings_and_courtesy'];
  const settleRank = (id: string) => { const i = SETTLE_ORDER.findIndex((k) => id.includes(k)); return i < 0 ? 99 : i; };
  const settleList = settling && countryLessons.length > 0;
  const filteredLessons = settleList
    ? [...countryLessons].filter((l) => !l.id.includes('greetings_and_courtesy')).sort((a, b) => settleRank(a.id) - settleRank(b.id)) // a native speaker does not need the greetings lesson
    : [...countryLessons, ...spanishLessons].filter(lesson => lesson.difficulty === selectedDifficulty);

  const startLesson = (lesson: Lesson) => {
    // 15 Nov 2026: the page lives at /learning/:moduleId - "/learning-module/" opened "page not found" for every lesson.
    navigate(`/learning/${lesson.id}`);
  };

  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          {settling && countryLessons.length ? t('lm.titleSettle', { country: countryKey ? t(`lm.country.${countryKey}`, { defaultValue: countryName }) : countryName }) : t('lm.title')}
        </CardTitle>
        {countryName && (
          <p className="text-sm text-muted-foreground">{t(settling ? 'lm.livingInSettle' : 'lm.livingIn', { country: t(`lm.country.${countryKey}`, { defaultValue: countryName }) })}</p>
        )}
        
        {/* Difficulty Filter (not for a settling family - see settleList) */}
        {!settleList && (
        <div className="flex flex-wrap gap-2 mt-4">
          {(['beginner', 'intermediate', 'advanced'] as const).map((difficulty) => (
            <Button
              key={difficulty}
              variant={selectedDifficulty === difficulty ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDifficulty(difficulty)}
              className={selectedDifficulty === difficulty ? "bg-[hsl(var(--espaluz-primary))]" : ""}
            >
              {t(`fam.levels.${difficulty}`)}
            </Button>
          ))}
        </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {filteredLessons.map((lesson, index) => (
          <div key={lesson.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              {/* 18 Nov 2026: min-w-0 + wrap - "Empezar" pushed the Spanish page 3px wider than the phone. */}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {getCategoryIcon(lesson.category)}
                  <h3 className="font-semibold">{lessonTitle(lesson, t)}</h3>
                  {!settleList && (
                  <Badge 
                    variant="outline" 
                    className={`${getDifficultyColor(lesson.difficulty)} border-0`}
                  >
                    {t(`fam.levels.${lesson.difficulty}`, { defaultValue: lesson.difficulty })}
                  </Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {lessonDescription(lesson, t)}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{t('lm.minutes', { count: lesson.estimatedMinutes })}</span>
                  </div>
                  {/* 18 Nov 2026 (professional readers: "0 words makes the lesson look broken"): shown only when there are words. */}
                  {lesson.vocabulary.length > 0 && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    <span>{t('lm.words', { count: lesson.vocabulary.length })}</span>
                  </div>
                  )}
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{t('lm.phrases', { count: lesson.phrases.length })}</span>
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
                      {t('lm.more', { count: lesson.vocabulary.length - 5 })}
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
                          ? t('lm.complete')
                          : userProgress[lesson.id]?.progress 
                          ? `${userProgress[lesson.id].progress}%` 
                          : t('lm.notStarted')}
                      </span>
                      {userProgress[lesson.id]?.isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </>
                  )}
                </div>
              </div>
              
              <Button
                onClick={() => startLesson(lesson)}
                size="sm"
                className="shrink-0 bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
              >
                <Play className="h-4 w-4 mr-1" />
                {userProgress[lesson.id]?.isCompleted 
                  ? t('lm.review')
                  : userProgress[lesson.id]?.progress 
                  ? t('lm.continue')
                  : t('lm.start')}
              </Button>
            </div>
          </div>
        ))}
        
        <div className="text-center pt-4">
          {filteredLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {countryName ? t('lm.noLessons') : t('lm.noCountry')}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {countryName ? t('lm.everyCard', { country: t(`lm.country.${countryKey}`, { defaultValue: countryName }) }) : t('lm.noCountryShort')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
