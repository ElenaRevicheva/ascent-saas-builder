import { useState } from 'react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, BookOpen, Play, CheckCircle, MessageSquare, Sparkles } from 'lucide-react';
import { ChatWithEspaluz } from '@/components/dashboard/ChatWithEspaluz';

interface OnboardingFirstLessonProps {
  onComplete: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const OnboardingFirstLesson = ({ onComplete, onNext, onPrevious }: OnboardingFirstLessonProps) => {
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(false);

  const handleStartLesson = () => {
    setHasStartedChat(true);
  };

  const handleContinue = () => {
    onComplete();
    onNext();
  };

  const handleSkip = () => {
    onComplete();
    onNext();
  };

  // Mock lesson data for demonstration
  const lessonTopics = [
    { id: 'greetings', title: 'Basic Greetings', description: 'Hola, Buenos días, ¿Cómo estás?', completed: false },
    { id: 'family', title: 'Family Members', description: 'Madre, padre, hermano, hermana', completed: false },
    { id: 'numbers', title: 'Numbers 1-10', description: 'Uno, dos, tres, cuatro, cinco...', completed: false }
  ];

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <BookOpen className="h-6 w-6 text-[hsl(var(--espaluz-primary))]" />
          Try Your First Lesson
        </CardTitle>
        <CardDescription className="text-lg">
          Experience the power of your AI Spanish tutor with a quick interactive lesson.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!hasStartedChat ? (
          <>
            <div className="bg-[hsl(var(--espaluz-primary))]/10 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-[hsl(var(--espaluz-primary))] flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                What makes our AI tutor special:
              </h4>
              <ul className="text-sm space-y-1">
                <li>• Adapts to your learning level and pace</li>
                <li>• Provides instant feedback and corrections</li>
                <li>• Remembers your progress across sessions</li>
                <li>• Creates personalized practice exercises</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Today's Mini Lesson Topics:</h3>
              <div className="grid gap-3">
                {lessonTopics.map((topic) => (
                  <div key={topic.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--espaluz-primary))]/10 flex items-center justify-center">
                      <Play className="h-4 w-4 text-[hsl(var(--espaluz-primary))]" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{topic.title}</div>
                      <div className="text-sm text-muted-foreground">{topic.description}</div>
                    </div>
                    <Badge variant="outline">3 min</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center space-y-4">
              <Button 
                onClick={handleStartLesson}
                size="lg"
                className="bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] hover:opacity-90"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Your First Lesson
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Don't worry - this is just a sample. You can always come back to full lessons later!
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-800 dark:text-green-200">Live AI Tutor Demo</h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Try asking the AI tutor questions like "How do I say hello in Spanish?" or "Teach me numbers 1-5"
              </p>
            </div>

            {/* Embed the actual chat component for demo */}
            <div className="border border-border rounded-lg overflow-hidden" style={{ maxHeight: '400px' }}>
              <ChatWithEspaluz />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">After this demo, you'll be able to:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[hsl(var(--espaluz-primary))]" />
                  <span>Chat via Telegram</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[hsl(var(--espaluz-primary))]" />
                  <span>Access structured lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[hsl(var(--espaluz-primary))]" />
                  <span>Track your progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[hsl(var(--espaluz-primary))]" />
                  <span>Earn achievements</span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button 
              onClick={handleContinue}
              className="bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] hover:opacity-90"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
};