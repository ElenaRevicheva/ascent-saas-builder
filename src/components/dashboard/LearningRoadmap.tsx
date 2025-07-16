import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle, Users, MessageSquare, BookOpen, BarChart3, Crown, ArrowRight, Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LearningOptions } from './LearningOptions';

interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: string;
  link?: string;
  onClick?: () => void;
  completed?: boolean;
}

export const LearningRoadmap = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const roadmapSteps: RoadmapStep[] = [
    {
      id: 'setup-family',
      title: 'Set Up Your Family',
      description: 'Add family members who will learn Spanish together. Customize their learning levels and preferences.',
      icon: Users,
      action: 'Add Family Members',
      onClick: () => {
        setOpen(false);
        setTimeout(() => {
          const familySection = document.querySelector('[data-family-members]');
          if (familySection) {
            familySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Automatically open the add member dialog
            setTimeout(() => {
              const addMemberButton = familySection.querySelector('button');
              if (addMemberButton && addMemberButton.textContent?.includes('Add Member')) {
                addMemberButton.click();
              }
            }, 500);
          }
        }, 100);
      }
    },
    {
      id: 'connect-telegram',
      title: 'Connect to Telegram Bot',
      description: 'Connect with EspaLuz bot on Telegram for interactive Spanish practice anytime.',
      icon: MessageSquare,
      action: 'Connect Bot',
      link: '/connect-bot'
    },
    {
      id: 'first-lesson',
      title: 'Start Your First Lesson',
      description: 'Choose between Telegram bot chat or dashboard web chat for your Spanish learning experience.',
      icon: BookOpen,
      action: 'Choose Learning Method',
      onClick: () => {
        setOpen(false);
        // Trigger the LearningOptions dialog
        setTimeout(() => {
          const learningOptionsButton = document.querySelector('[data-learning-options-trigger]');
          if (learningOptionsButton) {
            (learningOptionsButton as HTMLButtonElement).click();
          }
        }, 100);
      }
    },
    {
      id: 'track-progress',
      title: 'Track Your Progress',
      description: 'Monitor learning achievements, streaks, and vocabulary growth for the whole family.',
      icon: BarChart3,
      action: 'View Analytics',
      onClick: () => {
        setOpen(false);
        setTimeout(() => {
          const analyticsSection = document.querySelector('[data-learning-analytics]');
          if (analyticsSection) {
            analyticsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    },
    {
      id: 'upgrade',
      title: 'Unlock Full Features',
      description: 'Upgrade to access unlimited lessons, voice generation, and advanced family features.',
      icon: Crown,
      action: 'Upgrade Plan',
      onClick: () => {
        setOpen(false);
        setTimeout(() => {
          const accountSection = document.querySelector('[data-account-status]');
          if (accountSection) {
            accountSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  ];

  const handleStepAction = (step: RoadmapStep) => {
    if (step.link) {
      setOpen(false);
    } else if (step.onClick) {
      step.onClick();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white shadow-lg px-8 py-3 text-lg font-semibold"
        >
          <Map className="h-5 w-5 mr-2" />
          Your Learning Roadmap
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-pink-400 to-purple-600 bg-clip-text text-transparent">
            Your Spanish Learning Journey 🗺️
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-purple-50 rounded-lg border border-orange-200">
            <h3 className="text-lg font-semibold text-orange-800 mb-2">Welcome to EspaLuz! ✨</h3>
            <p className="text-orange-700">
              Follow these steps to start your magical Spanish learning adventure with your family.
              Each step builds on the previous one to create the perfect learning experience.
            </p>
          </div>

          <div className="grid gap-4">
            {roadmapSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = step.completed;
              
              return (
                <Card key={step.id} className="transition-all duration-300 hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div className={`p-2 rounded-full ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {step.title}
                          {isCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm mb-4">
                      {step.description}
                    </CardDescription>
                    
                    <div className="flex justify-end">
                      {step.link ? (
                        <Button 
                          asChild
                          variant={isCompleted ? "outline" : "default"}
                          size="sm"
                        >
                          <Link to={step.link} onClick={() => setOpen(false)}>
                            {step.action}
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      ) : (
                        <Button 
                          variant={isCompleted ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleStepAction(step)}
                        >
                          {step.action}
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-2">🎯 Pro Tip</h4>
            <p className="text-sm text-purple-700">
              Complete each step in order for the best experience. You can always come back to this roadmap 
              by clicking the "Your Learning Journey" button in your dashboard header.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};