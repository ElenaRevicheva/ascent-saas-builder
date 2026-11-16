
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Monitor, Smartphone, Bot, Users, Zap, ArrowRight, CheckCircle, Smile } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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

interface LearningOptionsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const LearningOptions = ({ open: controlledOpen, onOpenChange }: LearningOptionsProps = {}) => {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const learningOptions: LearningOption[] = [
    {
      id: 'telegram-bot',
      title: t('opts.tg.title'),
      description: t('opts.tg.description'),
      icon: Bot,
      features: [
        t('opts.tg.f1'),
        t('opts.tg.f2'),
        t('opts.tg.f3'),
        t('opts.tg.f4'),
        t('opts.tg.f5')
      ],
      pros: [
        t('opts.tg.p1'),
        t('opts.tg.p2'),
        t('opts.tg.p3'),
        t('opts.tg.p4')
      ],
      action: t('opts.tg.action'),
      actionLink: '/connect-bot',
      actionType: 'link',
      gradient: 'from-blue-500 to-cyan-500',
      badgeText: t('opts.tg.badgeText'),
      popular: true
    },
    {
      id: 'kids-classroom',
      title: t('opts.kids.title'),
      description: t('opts.kids.description'),
      icon: Smile,
      features: [
        t('opts.kids.f1'),
        t('opts.kids.f2'),
        t('opts.kids.f3'),
        t('opts.kids.f4'),
        t('opts.kids.f5'),
        t('opts.kids.f6'),
        t('opts.kids.f7')
      ],
      pros: [
        t('opts.kids.p1'),
        t('opts.kids.p2'),
        t('opts.kids.p3'),
        t('opts.kids.p4')
      ],
      action: t('opts.kids.action'),
      actionLink: '/classroom',
      actionType: 'link',
      gradient: 'from-green-500 to-emerald-500',
      badgeText: t('opts.kids.badgeText')
    },
    {
      id: 'dashboard-chat',
      title: t('opts.web.title'),
      description: t('opts.web.description'),
      icon: Monitor,
      features: [
        t('opts.web.f1'),
        t('opts.web.f2'),
        t('opts.web.f3'),
        t('opts.web.f4'),
        t('opts.web.f5')
      ],
      pros: [
        t('opts.web.p1'),
        t('opts.web.p2'),
        t('opts.web.p3'),
        t('opts.web.p4')
      ],
      action: t('opts.web.action'),
      actionType: 'scroll',
      gradient: 'from-purple-500 to-pink-500',
      badgeText: t('opts.web.badgeText')
    }
  ];

  const handleOptionAction = (option: LearningOption) => {
    if (option.actionType === 'scroll') {
      setOpen(false);
      // Give more time for dialog to close and ensure DOM is ready
      setTimeout(() => {
        const chatSection = document.querySelector('#chat');
        if (chatSection) {
          chatSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Fallback: try to scroll to bottom of page if chat section not found
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
      }, 300);
    } else if (option.actionLink) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Only show trigger if not controlled from parent */}
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button 
            size="sm"
            className="w-full mt-3 bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
            data-learning-options-trigger
          >
            <Zap className="h-4 w-4 mr-2" />
            {t('actions.title')}
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            {t('opts.title')}
          </DialogTitle>
          <p className="text-muted-foreground text-center">
            {t('opts.sub')}
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
                       {option.badgeText}
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
                      {t('opts.keyFeatures')}
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
                      {t('opts.whyChoose')}
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
              {t('opts.familiesTitle')}
            </h3>
            <p className="text-sm text-green-700 max-w-2xl mx-auto">
              {t('opts.familiesBody')}
            </p>
          </div>
        </div>
        
        <div className="text-center text-xs text-muted-foreground mt-4">
           {t('opts.switchNote')}
        </div>
      </DialogContent>
    </Dialog>
  );
};
