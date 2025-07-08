import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Sparkles, Zap, Crown, Heart } from 'lucide-react';

interface FeatureAccessCardProps {
  hasFeatureAccess: (feature: string) => boolean;
}

export const FeatureAccessCard = ({ hasFeatureAccess }: FeatureAccessCardProps) => {
  return (
    <Card className="border-border/50 shadow-magical md:col-span-2 lg:col-span-3" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          EspaLuz Features - Your Spanish Learning Toolkit 🎯
        </CardTitle>
        <CardDescription>
          Discover what magical features are available for your family's Spanish journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          
          <div className="space-y-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <h4 className="font-medium text-green-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Características Básicas
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Telegram Integration 📱</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Basic Conversations 💬</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h4 className="font-medium text-blue-800 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Características Avanzadas
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasFeatureAccess('unlimited_conversations') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>Unlimited Conversations ∞</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasFeatureAccess('avatar_videos') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>Avatar Videos 🎬</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-lg bg-purple-50 border border-purple-200">
            <h4 className="font-medium text-purple-800 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Características Premium
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasFeatureAccess('voice_messages') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>Voice Messages 🎤</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasFeatureAccess('progress_analytics') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>Progress Analytics 📊</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-lg bg-orange-50 border border-orange-200">
            <h4 className="font-medium text-orange-800 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Soporte Familiar
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasFeatureAccess('priority_support') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span>Priority Support ⭐</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Community Support 👥</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};