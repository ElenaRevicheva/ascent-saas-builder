import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import familyLearningSpanish from '@/assets/family-learning-spanish.jpg';
// 11 Nov 2026 (Elena): the dashboard wore the old cartoon avatar and gradient title. It now matches the home page:
// the photoreal EspaLuz face (same as the hello video) and the same Espa<b>Luz</b> wordmark as the site header.
import espaluzFace from '@/assets/heroes/hello-poster.jpg';
import { LearningRoadmap } from './LearningRoadmap';
import { Link } from 'react-router-dom';

interface DashboardHeaderProps {
  user: any;
  getStatusBadge: () => React.ReactNode;
  signOut: () => void;
}

export const DashboardHeader = ({ user, getStatusBadge, signOut }: DashboardHeaderProps) => {
  const { t } = useTranslation();
  // 11 Nov 2026: greet by first name only ("Hello, Kira!"), the way a friend would. The email fallback is gone:
  // "Hello, kiravelerevich!" reads like a login, not a person. No name -> plain "Hello!".
  const firstName = String(user?.user_metadata?.full_name ?? '').trim().split(/\s+/)[0] || '';

  return (
    <div className="relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(120deg, #ffb199 0%, #ff0844 50%, #833ab4 100%)', // orange, rose, purple
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(1px)'
        }}
      />
      <div className="relative z-10 bg-gradient-to-r from-[#fff0e6]/90 via-[#fce4ec]/70 to-transparent">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <img src={espaluzFace} alt="EspaLuz" className="h-16 w-16 shrink-0 rounded-full border-2 border-white object-cover object-[50%_35%] shadow-lg ring-2 ring-purple-300" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground"><span className="brand-wordmark">Espa<b>Luz</b></span></h1>
                  <p className="text-sm text-rose-600">{t('dashboard.greeting')}{firstName ? `, ${firstName}` : ''}! ✨</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <LanguageSwitcher variant="select" size="sm" />
                {getStatusBadge()}
                <Button asChild variant="hero" size="lg" className="bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg">
                  <Link to="/classroom">🦥🐒 Kids classroom</Link>
                </Button>
                <Button
                  variant="hero"
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg"
                  onClick={() => {
                    // 11 Nov 2026: this scrolled to a QR image that is no longer on the dashboard, so the button did nothing.
                    // It now opens the existing Family Members card (add each person: name, age, level).
                    const target = document.querySelector('[data-family-members]');
                    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  👨‍👩‍👧 Add your family
                </Button>
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
              <h2 className="text-4xl font-bold text-purple-700 mb-4">
                {t('dashboard.welcome')}
              </h2>
              <p className="text-lg text-orange-700 max-w-2xl mx-auto mb-6">
                {t('dashboard.subtitle')}
              </p>
              <LearningRoadmap />
            </div>
        </div>
      </div>
    </div>
  );
};