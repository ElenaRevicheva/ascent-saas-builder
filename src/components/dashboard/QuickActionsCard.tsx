import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FeatureGate from '@/components/FeatureGate';
import { Bot, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import familyDinnerSpanish from '@/assets/family-dinner-spanish.jpg';

export const QuickActionsCard = () => {
  const { t } = useTranslation();
  
  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <div 
          className="w-full h-32 rounded-lg mb-3 bg-cover bg-center"
          style={{ backgroundImage: `url(${familyDinnerSpanish})` }}
        />
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          {t('actions.title')}
        </CardTitle>
        <CardDescription>
          {t('actions.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start border-[hsl(var(--espaluz-primary))] text-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/10" 
          asChild
        >
          <Link to="/connect-bot">
            <Bot className="h-4 w-4 mr-2" />
            {t('actions.connectTelegram')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};