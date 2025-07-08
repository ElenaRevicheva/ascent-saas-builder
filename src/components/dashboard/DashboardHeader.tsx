import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import familyLearningSpanish from '@/assets/family-learning-spanish.jpg';

interface DashboardHeaderProps {
  user: any;
  getStatusBadge: () => React.ReactNode;
  signOut: () => void;
}

export const DashboardHeader = ({ user, getStatusBadge, signOut }: DashboardHeaderProps) => {
  const { t } = useTranslation();
  return (
    <div className="relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${familyLearningSpanish})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(1px)'
        }}
      />
      <div className="relative z-10 bg-gradient-to-r from-background/90 via-background/70 to-transparent">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Sparkles className="h-8 w-8 text-[hsl(var(--espaluz-primary))]" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[hsl(var(--espaluz-secondary))] rounded-full animate-pulse" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] bg-clip-text text-transparent">
                    {t('dashboard.title')}
                  </h1>
                  <p className="text-sm text-muted-foreground">{t('dashboard.greeting')}, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}! ✨</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <LanguageSwitcher variant="select" size="sm" />
                {getStatusBadge()}
                <Button variant="ghost" size="sm" onClick={signOut}>
                  {t('dashboard.signOut')}
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Welcome Hero */}
        <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                {t('dashboard.welcome')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('dashboard.subtitle')}
              </p>
            </div>
        </div>
      </div>
    </div>
  );
};