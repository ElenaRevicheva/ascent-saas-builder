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
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">EspaLuz Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || user?.email}</p>
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

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Account Status */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Status
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
                  <span className="font-medium">{trialDaysLeft}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`font-medium ${isSubscriptionActive || isTrialActive ? 'text-green-600' : 'text-orange-600'}`}>
                  {isSubscriptionActive ? 'Active' : isTrialActive ? 'Trial' : 'Free'}
                </span>
              </div>

              {!isSubscriptionActive && (
                <Link to="/#pricing" className="block">
                  <Button variant="hero" size="sm" className="w-full">
                    Upgrade to Standard
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Quick Start
              </CardTitle>
              <CardDescription>
                Connect with EspaLuz on your favorite platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
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
                    WhatsApp (Premium)
                  </Button>
                }
              >
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp Chat
                </Button>
              </FeatureGate>
            </CardContent>
          </Card>

          {/* Learning Progress */}
          <FeatureGate 
            feature="progress_analytics"
            fallback={
              <Card className="border-border shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Learning Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Upgrade to view your learning analytics
                  </p>
                  <Link to="/#pricing">
                    <Button variant="hero" size="sm">Upgrade Now</Button>
                  </Link>
                </CardContent>
              </Card>
            }
          >
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Conversations</span>
                    <span className="font-medium">24 this week</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full w-3/4"></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Learning Streak</span>
                    <span className="font-medium">7 days</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FeatureGate>

          {/* Feature Access Overview */}
          <Card className="border-border shadow-card md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Feature Access
              </CardTitle>
              <CardDescription>
                See what features are available in your current plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                
                <div className="space-y-2">
                  <h4 className="font-medium">Basic Features</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Telegram Integration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Basic Conversations</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Advanced Features</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${hasFeatureAccess('unlimited_conversations') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>Unlimited Conversations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${hasFeatureAccess('avatar_videos') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>Avatar Videos</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Premium Features</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${hasFeatureAccess('voice_messages') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>Voice Messages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${hasFeatureAccess('progress_analytics') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>Progress Analytics</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Support</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${hasFeatureAccess('priority_support') ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>Priority Support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Community Support</span>
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