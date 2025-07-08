import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Sparkles, Trophy, Target, Users, MessageSquare, BarChart3 } from 'lucide-react';

interface OnboardingCompleteProps {
  onFinish: () => void;
  onPrevious: () => void;
  isLoading: boolean;
}

export const OnboardingComplete = ({ onFinish, onPrevious, isLoading }: OnboardingCompleteProps) => {
  const nextSteps = [
    {
      icon: MessageSquare,
      title: 'Start Your First Conversation',
      description: 'Chat with your AI tutor and begin learning immediately',
      badge: 'Recommended'
    },
    {
      icon: Target,
      title: 'Set Daily Goals',
      description: 'Establish learning targets and build consistent habits',
      badge: 'Popular'
    },
    {
      icon: Users,
      title: 'Invite Family Members',
      description: 'Add more family members to your learning circle',
      badge: 'Family'
    },
    {
      icon: BarChart3,
      title: 'Track Your Progress',
      description: 'Monitor learning streaks and vocabulary growth',
      badge: 'Analytics'
    }
  ];

  const achievements = [
    'Set up your family learning profile',
    'Experienced your AI Spanish tutor',
    'Connected your preferred platform',
    'Ready to start your Spanish journey'
  ];

  return (
    <>
      <CardHeader className="text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] flex items-center justify-center mx-auto mb-4">
          <Trophy className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl">¡Felicidades! You're All Set!</CardTitle>
        <CardDescription className="text-lg">
          Your EspaLuz Spanish learning journey is ready to begin. Let's start speaking Spanish together!
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-gradient-to-r from-[hsl(var(--espaluz-primary))]/10 to-[hsl(var(--espaluz-accent))]/10 p-4 rounded-lg border border-[hsl(var(--espaluz-primary))]/20">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Onboarding Complete
          </h3>
          <div className="grid gap-2">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{achievement}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
            Recommended Next Steps
          </h3>
          <div className="grid gap-3">
            {nextSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(var(--espaluz-primary))]/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{step.title}</span>
                      <Badge variant="outline" className="text-xs">{step.badge}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Your Learning Journey Starts Now!</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <strong>What you can do:</strong>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Chat with AI tutor anytime</li>
                <li>Practice with family members</li>
                <li>Track daily progress</li>
              </ul>
            </div>
            <div className="space-y-1">
              <strong>Premium features:</strong>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>WhatsApp integration</li>
                <li>Advanced analytics</li>
                <li>Custom lesson plans</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Remember: Consistency is key! Even 10 minutes a day can make a huge difference in your Spanish learning journey.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Pro tip: Set up daily reminders to maintain your learning streak</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          <Button 
            onClick={onFinish}
            disabled={isLoading}
            size="lg"
            className="bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] hover:opacity-90"
          >
            {isLoading ? 'Setting up...' : 'Start Learning Spanish!'}
            <Sparkles className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </>
  );
};