import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

const SubscriptionSuccess = () => {
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for subscription data in localStorage
    const pendingSubscription = localStorage.getItem('pending-subscription');
    
    if (pendingSubscription) {
      try {
        const data = JSON.parse(pendingSubscription);
        setSubscriptionData(data);
        console.log('Found pending subscription:', data);
      } catch (error) {
        console.error('Error parsing subscription data:', error);
        toast({
          title: "Error",
          description: "There was an issue retrieving your subscription information.",
          variant: "destructive"
        });
      }
    } else {
      // No subscription data found, redirect to pricing
      console.log('No pending subscription found, redirecting to pricing');
      navigate('/#pricing');
    }
    
    setIsLoading(false);
  }, [navigate, toast]);

  const handleContinueToSignup = () => {
    if (subscriptionData) {
      const params = new URLSearchParams({
        subscription: 'success',
        email: subscriptionData.email,
        name: subscriptionData.fullName
      });
      navigate(`/auth?${params.toString()}`);
    } else {
      navigate('/auth');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>No Subscription Found</CardTitle>
            <CardDescription>
              We couldn't find your subscription information.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/#pricing">
              <Button className="w-full">
                Back to Pricing
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">EspaLuz</h1>
          </div>
          <p className="text-muted-foreground">
            Your AI Spanish tutor awaits
          </p>
        </div>

        <Card className="border-border shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-700">Payment Successful! 🎉</CardTitle>
            <CardDescription>
              Your PayPal subscription has been activated
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Subscription Details:</strong><br />
                Plan: {subscriptionData.planType === 'standard' ? 'EspaLuz Standard' : 'EspaLuz Premium'}<br />
                Email: {subscriptionData.email}<br />
                Subscription ID: {subscriptionData.subscriptionId}
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-semibold text-center">Next Step: Create Your Account</h3>
              <p className="text-sm text-muted-foreground text-center">
                To access your EspaLuz subscription, please create your account. 
                Your payment information has been saved and your subscription will be activated automatically.
              </p>
              
              <Button 
                onClick={handleContinueToSignup}
                className="w-full bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
                size="lg"
              >
                Create Account & Access EspaLuz
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Already have an account? <Link to="/auth" className="text-primary hover:underline">Sign in here</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;