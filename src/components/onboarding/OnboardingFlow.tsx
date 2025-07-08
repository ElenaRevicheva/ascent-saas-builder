import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, CheckCircle, Sparkles, Users, MessageSquare, Target, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingFamilySetup } from './OnboardingFamilySetup';
import { OnboardingFirstLesson } from './OnboardingFirstLesson';
import { OnboardingConnectBot } from './OnboardingConnectBot';
import { OnboardingComplete } from './OnboardingComplete';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export type OnboardingStep = 'welcome' | 'family' | 'lesson' | 'connect' | 'complete';

const STEPS: { id: OnboardingStep; title: string; description: string; icon: any }[] = [
  {
    id: 'welcome',
    title: 'Welcome to EspaLuz',
    description: 'Set your learning goals',
    icon: Target
  },
  {
    id: 'family',
    title: 'Family Setup',
    description: 'Add family members',
    icon: Users
  },
  {
    id: 'lesson',
    title: 'First Lesson',
    description: 'Try your AI tutor',
    icon: BookOpen
  },
  {
    id: 'connect',
    title: 'Connect Platform',
    description: 'Link Telegram/WhatsApp',
    icon: MessageSquare
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    description: 'Start your journey',
    icon: CheckCircle
  }
];

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const markStepComplete = useCallback((step: OnboardingStep) => {
    setCompletedSteps(prev => new Set(prev).add(step));
  }, []);

  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex]);

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update user profile to mark onboarding as complete
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        });

      if (error) throw error;

      // Track onboarding completion
      await supabase
        .from('usage_tracking')
        .insert({
          user_id: user.id,
          feature_type: 'onboarding_completed',
          usage_count: 1
        });

      toast.success('Welcome to EspaLuz! Your learning journey begins now.');
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding');
    } finally {
      setIsLoading(false);
    }
  }, [user, onComplete]);

  const canGoNext = () => {
    return completedSteps.has(currentStep) || currentStep === 'connect'; // Connect step is optional
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <OnboardingWelcome 
            onComplete={() => markStepComplete('welcome')}
            onNext={goToNextStep}
          />
        );
      case 'family':
        return (
          <OnboardingFamilySetup 
            onComplete={() => markStepComplete('family')}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
          />
        );
      case 'lesson':
        return (
          <OnboardingFirstLesson 
            onComplete={() => markStepComplete('lesson')}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
          />
        );
      case 'connect':
        return (
          <OnboardingConnectBot 
            onComplete={() => markStepComplete('connect')}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
            onSkip={() => {
              markStepComplete('connect');
              goToNextStep();
            }}
          />
        );
      case 'complete':
        return (
          <OnboardingComplete 
            onFinish={completeOnboarding}
            onPrevious={goToPreviousStep}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-magical)' }}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-[hsl(var(--espaluz-primary))]" />
            <h1 className="text-3xl font-bold">Welcome to EspaLuz</h1>
          </div>
          <p className="text-muted-foreground">Let's get you set up for success in just a few steps</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto">
          <div className="flex items-center gap-4 min-w-max">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = completedSteps.has(step.id);
              const isPast = index < currentStepIndex;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div 
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-[hsl(var(--espaluz-primary))]/10 border border-[hsl(var(--espaluz-primary))]' 
                        : isCompleted || isPast
                        ? 'bg-green-500/10 border border-green-500'
                        : 'bg-muted border border-border'
                    }`}
                  >
                    <Icon 
                      className={`h-5 w-5 ${
                        isActive 
                          ? 'text-[hsl(var(--espaluz-primary))]' 
                          : isCompleted || isPast
                          ? 'text-green-500'
                          : 'text-muted-foreground'
                      }`} 
                    />
                    <div className="text-center">
                      <div className={`text-xs font-medium ${
                        isActive 
                          ? 'text-[hsl(var(--espaluz-primary))]' 
                          : isCompleted || isPast
                          ? 'text-green-500'
                          : 'text-muted-foreground'
                      }`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="border-border/50 shadow-magical animate-fade-in" style={{ background: 'var(--gradient-card)' }}>
          {renderStepContent()}
        </Card>

        {/* Skip Option */}
        {currentStep !== 'complete' && (
          <div className="text-center mt-6">
            <Button 
              variant="ghost" 
              onClick={onComplete}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip onboarding for now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};