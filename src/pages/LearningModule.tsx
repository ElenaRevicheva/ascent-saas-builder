
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
  Star,
  Volume2,
  Play,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { getLessonById, Lesson, Exercise } from '@/data/spanishLessons';
import { toast } from 'sonner';

export default function LearningModulePage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackProgress } = useLearningProgress();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [completedVocabulary, setCompletedVocabulary] = useState<string[]>([]);

  useEffect(() => {
    if (moduleId) {
      const foundLesson = getLessonById(moduleId);
      if (foundLesson) {
        setLesson(foundLesson);
      } else {
        toast.error('Lesson not found');
        navigate('/dashboard');
      }
    }
  }, [moduleId, navigate]);

  const totalSteps = lesson ? 3 : 0; // Vocabulary, Phrases, Exercises
  const progress = Math.round(((currentStep + 1) / totalSteps) * 100);

  const completeStep = async () => {
    if (!lesson || !user) return;

    const timeSpent = Math.round((Date.now() - sessionStartTime) / 60000);
    const newStep = Math.min(currentStep + 1, totalSteps - 1);
    const isCompleted = newStep >= totalSteps - 1;

    try {
      await trackProgress(lesson.id, {
        progressPercentage: Math.round(((newStep + 1) / totalSteps) * 100),
        isCompleted: isCompleted,
        timeSpentMinutes: timeSpent,
        vocabularyLearned: completedVocabulary,
        confidenceScore: 0.8
      });

      setCurrentStep(newStep);

      if (isCompleted) {
        toast.success('¡Excelente! Lesson completed!');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        toast.success('¡Muy bien! Moving to next section!');
      }

    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to save progress');
    }
  };

  const checkExerciseAnswer = () => {
    if (!lesson) return;
    
    const exercise = lesson.exercises[currentExercise];
    const isCorrect = userAnswer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
    
    setShowAnswer(true);
    
    if (isCorrect) {
      toast.success('¡Correcto! Correct!');
      // Add vocabulary from this exercise to completed list
      const newVocab = lesson.vocabulary.filter(word => 
        exercise.question.toLowerCase().includes(word) || 
        exercise.correctAnswer.toLowerCase().includes(word)
      );
      setCompletedVocabulary(prev => [...new Set([...prev, ...newVocab])]);
    } else {
      toast.error('Not quite right. Keep trying!');
    }
  };

  const nextExercise = () => {
    if (!lesson) return;
    
    if (currentExercise < lesson.exercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
      setUserAnswer('');
      setShowAnswer(false);
    } else {
      completeStep();
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--espaluz-primary))]"></div>
      </div>
    );
  }

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
      case 'vocabulary': return <BookOpen className="h-5 w-5" />;
      case 'conversation': return <Brain className="h-5 w-5" />;
      case 'grammar': return <Target className="h-5 w-5" />;
      default: return <Star className="h-5 w-5" />;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Vocabulary
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">📚 Vocabulary Learning</h3>
            <div className="grid gap-4">
              {lesson.vocabulary.map((word, index) => (
                <div key={index} className="bg-background/50 rounded-lg p-4 border">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-semibold text-[hsl(var(--espaluz-primary))]">
                        {word}
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">
                        Spanish word #{index + 1}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => speakText(word)}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 1: // Phrases
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">💬 Key Phrases</h3>
            <div className="grid gap-4">
              {lesson.phrases.map((phrase, index) => (
                <div key={index} className="bg-background/50 rounded-lg p-4 border">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-[hsl(var(--espaluz-primary))]">
                        {phrase.spanish}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => speakText(phrase.spanish)}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-muted-foreground">{phrase.english}</p>
                    <p className="text-sm text-muted-foreground italic">
                      Pronunciation: {phrase.pronunciation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2: // Exercises
        const exercise = lesson.exercises[currentExercise];
        if (!exercise) {
          return (
            <div className="text-center space-y-4">
              <Trophy className="h-16 w-16 text-[hsl(var(--espaluz-primary))] mx-auto" />
              <h3 className="text-xl font-semibold">¡Felicidades! Congratulations!</h3>
              <p>You've completed all exercises for this lesson!</p>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">🎯 Exercise {currentExercise + 1} of {lesson.exercises.length}</h3>
              <Badge variant="outline">
                {exercise.type.replace('_', ' ')}
              </Badge>
            </div>

            <div className="bg-background/50 rounded-lg p-6 border">
              <p className="text-lg mb-4">{exercise.question}</p>
              
              {exercise.type === 'multiple_choice' && exercise.options ? (
                <div className="space-y-2">
                  {exercise.options.map((option, index) => (
                    <Button
                      key={index}
                      variant={userAnswer === option ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setUserAnswer(option)}
                      disabled={showAnswer}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    className="w-full p-3 border rounded-lg"
                    disabled={showAnswer}
                  />
                </div>
              )}

              {!showAnswer && userAnswer && (
                <Button 
                  onClick={checkExerciseAnswer}
                  className="mt-4 bg-[hsl(var(--espaluz-primary))]"
                >
                  Check Answer
                </Button>
              )}

              {showAnswer && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <p className="font-semibold">Correct Answer: {exercise.correctAnswer}</p>
                  <p className="text-sm text-muted-foreground mt-2">{exercise.explanation}</p>
                  <Button 
                    onClick={nextExercise}
                    className="mt-3 bg-[hsl(var(--espaluz-primary))]"
                  >
                    {currentExercise < lesson.exercises.length - 1 ? 'Next Exercise' : 'Complete Lesson'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = ['Vocabulary', 'Phrases', 'Exercises'];

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
                {getCategoryIcon(lesson.category)}
                <h1 className="text-xl font-bold">{lesson.title}</h1>
                <Badge 
                  variant="outline" 
                  className={`${getDifficultyColor(lesson.difficulty)} text-white border-0`}
                >
                  {lesson.difficulty}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                <Clock className="h-4 w-4 inline mr-1" />
                {lesson.estimatedMinutes}min
              </div>
              <div className="text-sm font-medium">
                {progress}% Complete
              </div>
            </div>
          </div>
          
          <Progress value={progress} className="mt-4" />
          
          {/* Step indicators */}
          <div className="flex items-center gap-4 mt-4">
            {stepTitles.map((title, index) => (
              <div 
                key={index}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  index === currentStep 
                    ? 'bg-[hsl(var(--espaluz-primary))] text-white' 
                    : index < currentStep 
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStep && <CheckCircle2 className="h-4 w-4" />}
                {index === currentStep && <Play className="h-4 w-4" />}
                <span>{title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
            <CardHeader>
              <CardTitle>
                {stepTitles[currentStep]} - Step {currentStep + 1} of {totalSteps}
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {renderStepContent()}
              
              {currentStep < totalSteps - 1 && currentStep !== 2 && (
                <div className="flex justify-end mt-6">
                  <Button
                    onClick={completeStep}
                    className="bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
                  >
                    Next: {stepTitles[currentStep + 1]}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Summary */}
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
                    {completedVocabulary.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Words Learned</p>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">
                    {Math.round((Date.now() - sessionStartTime) / 60000)}m
                  </p>
                  <p className="text-sm text-muted-foreground">Time Spent</p>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">
                    {progress}%
                  </p>
                  <p className="text-sm text-muted-foreground">Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
