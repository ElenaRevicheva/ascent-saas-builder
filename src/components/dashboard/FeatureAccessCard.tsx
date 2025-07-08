import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Sparkles, Zap, Crown, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FeatureAccessCardProps {
  hasFeatureAccess: (feature: string) => boolean;
}

export const FeatureAccessCard = ({ hasFeatureAccess }: FeatureAccessCardProps) => {
  const { t } = useTranslation();
  
  return (
    <Card className="border-border/50 shadow-magical md:col-span-2 lg:col-span-3" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          {t('features.title')}
        </CardTitle>
        <CardDescription>
          {t('features.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          
          <div className="space-y-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <h4 className="font-medium text-green-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {t('features.basic')}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>{t('features.telegramIntegration')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>{t('features.basicConversations')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h4 className="font-medium text-blue-800 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              {t('features.advanced')}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasFeatureAccess('unlimited_conversations') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>{t('features.unlimitedConversations')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasFeatureAccess('avatar_videos') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>{t('features.avatarVideos')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-lg bg-purple-50 border border-purple-200">
            <h4 className="font-medium text-purple-800 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              {t('features.premium')}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasFeatureAccess('voice_messages') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>{t('features.voiceMessages')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasFeatureAccess('progress_analytics') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>{t('features.progressAnalytics')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-lg bg-orange-50 border border-orange-200">
            <h4 className="font-medium text-orange-800 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              {t('features.support')}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasFeatureAccess('priority_support') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>{t('features.prioritySupport')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>{t('features.communitySupport')}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};