import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FeatureGate from '@/components/FeatureGate';
import { 
  User, 
  Clock, 
  MessageSquare, 
  Crown, 
  Settings, 
  Bot,
  TrendingUp,
  Sparkles,
  Heart,
  Users,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import familyLearningSpanish from '@/assets/family-learning-spanish.jpg';
import familyDinnerSpanish from '@/assets/family-dinner-spanish.jpg';
import childGrandmaLearning from '@/assets/child-grandma-learning.jpg';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { 
    planType, 
    trialDaysLeft, 
    isTrialActive, 
    isSubscriptionActive, 
    hasFeatureAccess,
    loading 
  } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (isSubscriptionActive) {
      return <Badge variant="default" className="bg-green-500"><Crown className="h-3 w-3 mr-1" />Standard</Badge>;
    }
    if (isTrialActive) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{trialDaysLeft} days trial</Badge>;
    }
    return <Badge variant="outline">Free</Badge>;
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-magical)' }}>
      {/* Hero Section */}
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
                      EspaLuz
                    </h1>
                    <p className="text-sm text-muted-foreground">¡Hola, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}! ✨</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {getStatusBadge()}
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </header>
          
          {/* Welcome Hero */}
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Welcome to Your Spanish Journey! 🌟
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Connect with EspaLuz and start practicing Spanish with your family in a fun, magical way
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Account Status */}
          <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-[hsl(var(--espaluz-secondary))]" />
                Your Spanish Journey
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="font-medium capitalize">{planType.replace('_', ' ')}</span>
              </div>
              
              {isTrialActive && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trial Days Left</span>
                  <span className="font-medium text-[hsl(var(--espaluz-primary))]">{trialDaysLeft}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`font-medium ${isSubscriptionActive || isTrialActive ? 'text-green-600' : 'text-orange-600'}`}>
                  {isSubscriptionActive ? '¡Activo!' : isTrialActive ? '¡Prueba!' : 'Gratis'}
                </span>
              </div>

              {!isSubscriptionActive && (
                <Link to="/#pricing" className="block">
                  <Button 
                    size="sm" 
                    className="w-full bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] hover:opacity-90"
                  >
                    ¡Upgrade Now! ⭐
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
            <CardHeader>
              <div 
                className="w-full h-32 rounded-lg mb-3 bg-cover bg-center"
                style={{ backgroundImage: `url(${familyDinnerSpanish})` }}
              />
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
                Start Learning
              </CardTitle>
              <CardDescription>
                Connect with EspaLuz and practice with your family
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
                  Connect Telegram Bot
                </Link>
              </Button>
              
              <FeatureGate 
                feature="whatsapp_integration" 
                showUpgrade={false}
                fallback={
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp (Premium) 💫
                  </Button>
                }
              >
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp Chat 💬
                </Button>
              </FeatureGate>
            </CardContent>
          </Card>

          {/* Learning Progress */}
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

          {/* Feature Access Overview */}
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;