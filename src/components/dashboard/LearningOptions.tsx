import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Monitor, Smartphone, Bot, Users, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';

interface LearningOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  features: string[];
  pros: string[];
  action: string;
  actionLink?: string;
  actionType: 'scroll' | 'link';
  gradient: string;
  badgeText?: string;
  popular?: boolean;
}

export const LearningOptions = () => {
  const [open, setOpen] = useState(false);

  const learningOptions: LearningOption[] = [
    {
      id: 'telegram-bot',
      title: 'Telegram Bot Chat',
      description: 'Chat with EspaLuz bot on Telegram for convenient learning anywhere, anytime.',
      icon: Bot,
      features: [
        'Mobile-first experience',
        'Instant notifications',
        'Voice messages support',
        'Family group chats',
        'Offline message handling'
      ],
      pros: [
        'Learn on-the-go',
        'No app switching needed',
        'Natural messaging experience',
        'Works on any device'
      ],
      action: 'Connect Telegram Bot',
      actionLink: '/connect-bot',
      actionType: 'link',
      gradient: 'from-blue-500 to-cyan-500',
      badgeText: 'Most Popular',
      popular: true
    },
    {
      id: 'dashboard-chat',
      title: 'Dashboard Web Chat',
      description: 'Use the integrated chat feature right here in your dashboard for focused learning.',
      icon: Monitor,
      features: [
        'Full-screen chat experience',
        'Rich text formatting',
        'Progress tracking',
        'Learning analytics',
        'File sharing support'
      ],
      pros: [
        'Distraction-free environment',
        'Better for longer sessions',
        'Full dashboard integration',
        'Advanced features'
      ],
      action: 'Start Dashboard Chat',
      actionType: 'scroll',
      gradient: 'from-purple-500 to-pink-500',
      badgeText: 'Feature Rich'
    }
  ];

  const handleOptionAction = (option: LearningOption) => {
    if (option.actionType === 'scroll') {
      setOpen(false);
      setTimeout(() => {
        const chatSection = document.querySelector('#chat');
        if (chatSection) {
          chatSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else if (option.actionLink) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm"
          className="w-full mt-3 bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
          data-learning-options-trigger
        >
          <Zap className="h-4 w-4 mr-2" />
          Start Learning
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            Choose Your Learning Experience 🚀
          </DialogTitle>
          <p className="text-muted-foreground text-center">
            Select how you'd like to practice Spanish with EspaLuz. Both options offer personalized learning!
          </p>
        </DialogHeader>
        
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {learningOptions.map((option) => {
            const Icon = option.icon;
            
            return (
              <Card 
                key={option.id} 
                className={`relative border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                  option.popular ? 'border-blue-200 bg-blue-50/30' : 'border-purple-200 bg-purple-50/30'
                }`}
              >
                {option.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 text-xs font-semibold">
                      ⭐ {option.badgeText}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${option.gradient} text-white shadow-lg`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{option.title}</CardTitle>
                      {option.badgeText && !option.popular && (
                        <Badge variant="secondary" className="text-xs">
                          {option.badgeText}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {option.description}
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Key Features */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Key Features
                    </h4>
                    <div className="space-y-2">
                      {option.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Why Choose This */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Why Choose This
                    </h4>
                    <div className="grid gap-1">
                      {option.pros.map((pro, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                          <span>{pro}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="pt-4">
                    {option.actionType === 'link' && option.actionLink ? (
                      <Button 
                        asChild
                        className={`w-full bg-gradient-to-r ${option.gradient} hover:opacity-90 text-white shadow-lg`}
                        size="lg"
                      >
                        <Link to={option.actionLink} onClick={() => setOpen(false)}>
                          {option.action}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    ) : (
                      <Button 
                        className={`w-full bg-gradient-to-r ${option.gradient} hover:opacity-90 text-white shadow-lg`}
                        size="lg"
                        onClick={() => handleOptionAction(option)}
                      >
                        {option.action}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Comparison Footer */}
        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
          <div className="text-center">
            <h3 className="font-semibold text-green-800 mb-2 flex items-center justify-center gap-2">
              <Users className="h-5 w-5" />
              Perfect for Families!
            </h3>
            <p className="text-sm text-green-700 max-w-2xl mx-auto">
              Both options work great for family learning! You can even use both - start with Telegram for casual practice, 
              then use the dashboard for focused learning sessions. Your progress syncs across both platforms.
            </p>
          </div>
        </div>
        
        <div className="text-center text-xs text-muted-foreground mt-4">
          💡 You can switch between methods anytime - your learning progress is always saved!
        </div>
      </DialogContent>
    </Dialog>
  );
};