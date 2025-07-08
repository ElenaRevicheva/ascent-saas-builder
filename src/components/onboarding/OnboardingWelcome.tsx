import { useState } from 'react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Target, Heart, Users, Globe } from 'lucide-react';
import familyLearningSpanish from '@/assets/family-learning-spanish.jpg';

interface OnboardingWelcomeProps {
  onComplete: () => void;
  onNext: () => void;
}

const LEARNING_GOALS = [
  { id: 'family', label: 'Family Communication', icon: Users, description: 'Connect with Spanish-speaking relatives' },
  { id: 'travel', label: 'Travel & Culture', icon: Globe, description: 'Explore Spanish-speaking countries' },
  { id: 'career', label: 'Career Growth', icon: Target, description: 'Advance your professional opportunities' },
  { id: 'personal', label: 'Personal Enrichment', icon: Heart, description: 'Learn for the joy of learning' }
];

export const OnboardingWelcome = ({ onComplete, onNext }: OnboardingWelcomeProps) => {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleContinue = () => {
    onComplete();
    onNext();
  };

  return (
    <>
      <CardHeader className="text-center">
        <div 
          className="w-full h-48 rounded-lg mb-6 bg-cover bg-center"
          style={{ backgroundImage: `url(${familyLearningSpanish})` }}
        />
        <CardTitle className="text-2xl">¡Bienvenidos a EspaLuz!</CardTitle>
        <CardDescription className="text-lg">
          Your AI-powered Spanish learning journey starts here. Let's personalize your experience.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
            What's your main motivation for learning Spanish?
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select all that apply - this helps us customize your learning experience.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {LEARNING_GOALS.map((goal) => {
              const Icon = goal.icon;
              const isSelected = selectedGoals.includes(goal.id);
              
              return (
                <div
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
                    isSelected 
                      ? 'border-[hsl(var(--espaluz-primary))] bg-[hsl(var(--espaluz-primary))]/10' 
                      : 'border-border hover:border-[hsl(var(--espaluz-primary))]/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-1 ${
                      isSelected ? 'text-[hsl(var(--espaluz-primary))]' : 'text-muted-foreground'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium">{goal.label}</div>
                      <div className="text-sm text-muted-foreground">{goal.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">What makes EspaLuz special?</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center">
                <Heart className="h-3 w-3" />
              </Badge>
              <span>Family-focused learning</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center">
                <Target className="h-3 w-3" />
              </Badge>
              <span>AI-powered personalization</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center">
                <Globe className="h-3 w-3" />
              </Badge>
              <span>Multi-platform access</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleContinue}
            size="lg"
            className="bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] hover:opacity-90"
          >
            Let's Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </>
  );
};