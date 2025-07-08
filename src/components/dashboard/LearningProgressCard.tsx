import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FeatureGate from '@/components/FeatureGate';
import { Heart, Crown, MessageSquare, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import childGrandmaLearning from '@/assets/child-grandma-learning.jpg';

interface LearningProgressCardProps {
  hasFeatureAccess: (feature: string) => boolean;
}

export const LearningProgressCard = ({ hasFeatureAccess }: LearningProgressCardProps) => {
  return (
    <FeatureGate 
      feature="progress_analytics"
      fallback={
        <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
          <CardHeader>
            <div 
              className="w-full h-32 rounded-lg mb-3 bg-cover bg-center opacity-80"
              style={{ backgroundImage: `url(${childGrandmaLearning})` }}
            />
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-[hsl(var(--espaluz-secondary))]" />
              Family Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Crown className="h-12 w-12 text-[hsl(var(--espaluz-secondary))] mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Unlock family learning analytics ✨
            </p>
            <Link to="/#pricing">
              <Button 
                size="sm"
                className="bg-gradient-to-r from-[hsl(var(--espaluz-secondary))] to-[hsl(var(--espaluz-primary))] hover:opacity-90"
              >
                ¡Upgrade Now! 🌟
              </Button>
            </Link>
          </CardContent>
        </Card>
      }
    >
      <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
        <CardHeader>
          <div 
            className="w-full h-32 rounded-lg mb-3 bg-cover bg-center"
            style={{ backgroundImage: `url(${childGrandmaLearning})` }}
          />
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-[hsl(var(--espaluz-secondary))]" />
            Family Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Conversaciones
              </span>
              <span className="font-medium text-[hsl(var(--espaluz-primary))]">24 esta semana</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div className="h-3 rounded-full w-3/4 bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))]"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Racha de Aprendizaje
              </span>
              <span className="font-medium text-[hsl(var(--espaluz-secondary))]">7 días 🔥</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div className="h-3 rounded-full w-full bg-gradient-to-r from-[hsl(var(--espaluz-secondary))] to-[hsl(var(--espaluz-primary))]"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </FeatureGate>
  );
};