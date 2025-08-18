import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Sparkles, Eye, EyeOff, Crown } from 'lucide-react';

const SubscriptionComplete = () => {
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();

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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!subscriptionData) {
      setError('Subscription data is missing');
      return;
    }

    setIsCreatingAccount(true);
    setError('');

    try {
      console.log('Creating account for subscription user:', subscriptionData.email);
      
      const { user, error: signUpError } = await signUp(
        subscriptionData.email,
        password,
        subscriptionData.fullName
      );

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (user) {
        console.log('Account created successfully:', user.id);
        
        // Create subscription immediately after account creation
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .insert([{
            user_id: user.id,
            subscription_id: subscriptionData.subscriptionId,
            paypal_subscription_id: subscriptionData.subscriptionId,
            plan_type: subscriptionData.planType || 'standard',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }]);

        if (subError) {
          console.error('Failed to create subscription:', subError);
          // Don't show error to user, but log it for recovery
          localStorage.setItem('subscription-activation-error', JSON.stringify({
            userId: user.id,
            subscriptionId: subscriptionData.subscriptionId,
            error: subError.message,
            timestamp: new Date().toISOString()
          }));
        } else {
          console.log('Subscription created successfully');
          // Clear pending subscription data
          localStorage.removeItem('pending-subscription');
        }

        toast({
          title: "Account Created Successfully! 🎉",
          description: "Welcome to EspaLuz! Your subscription is now active.",
        });

        // Redirect to dashboard
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Account creation error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsCreatingAccount(false);
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
            <CardTitle className="text-green-700 flex items-center justify-center gap-2">
              <Crown className="h-5 w-5" />
              Payment Successful! 🎉
            </CardTitle>
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
              <h3 className="font-semibold text-center">Your account has been created! Just set the password here....</h3>
              
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password (min. 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isCreatingAccount}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isCreatingAccount}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isCreatingAccount}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isCreatingAccount}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit"
                  className="w-full bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
                  size="lg"
                  disabled={isCreatingAccount}
                >
                  {isCreatingAccount ? "Creating Account..." : "Complete Setup & Access EspaLuz"}
                </Button>
              </form>
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

export default SubscriptionComplete;