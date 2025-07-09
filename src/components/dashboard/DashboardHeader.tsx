import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import familyLearningSpanish from '@/assets/family-learning-spanish.jpg';
import brandAvatar1 from '@/assets/brand-avatar-1.jpg';

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
          background: 'linear-gradient(120deg, #ffb199 0%, #ff0844 50%, #833ab4 100%)', // orange, rose, purple
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(1px)'
        }}
      />
      <div className="relative z-10 bg-gradient-to-r from-[#fff0e6]/90 via-[#fce4ec]/70 to-transparent">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={brandAvatar1} alt="Brand" className="h-16 w-16 rounded-full border-4 border-orange-300 shadow-lg object-cover bg-white" />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-pink-400 to-purple-600 bg-clip-text text-transparent">
                    {t('dashboard.title')}
                  </h1>
                  <p className="text-sm text-rose-600">{t('dashboard.greeting')}, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}! ✨</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <LanguageSwitcher variant="select" size="sm" />
                {getStatusBadge()}
                <Button
                  variant="hero"
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg"
                  onClick={() => {
                    const qr = document.querySelector('img[alt="EspaLuz QR"]');
                    if (qr) qr.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  🎉 Invite your family!
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
              <p className="text-lg text-orange-700 max-w-2xl mx-auto">
                {t('dashboard.subtitle')}
              </p>
            </div>
        </div>
      </div>
    </div>
  );
};