import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, ArrowLeft, Sparkles } from 'lucide-react';
import SubscriptionRecovery from '@/components/SubscriptionRecovery';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    referralCode: ''
  });
  
  const { signIn, signUp, user } = useAuth();
  const { processReferralSignup } = useReferralTracking();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Function to handle pending subscription activation with improved error handling and retry
  const handlePendingSubscriptionActivation = async (user: any) => {
    const pendingSubscription = localStorage.getItem('pending-subscription');
    if (!user || !pendingSubscription) return;

    try {
      const subscriptionData = JSON.parse(pendingSubscription);
      console.log('Processing pending subscription for user:', user.id, 'PayPal ID:', subscriptionData.subscriptionId);
      console.log('Full subscription data:', subscriptionData);
      
      // First check if subscription already exists to avoid duplicates
      const { data: existingSub, error: checkError } = await supabase
        .from('user_subscriptions')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('paypal_subscription_id', subscriptionData.subscriptionId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing subscription:', checkError);
        throw new Error(`Database check failed: ${checkError.message}`);
      }

      if (existingSub) {
        console.log('Subscription already exists:', existingSub);
        localStorage.removeItem('pending-subscription');
        toast({
          title: "Subscription Already Active!",
          description: "Your subscription is already activated. Welcome to EspaLuz!",
        });
        return;
      }
      
      // Create subscription in database with retry mechanism
      let retryCount = 0;
      const maxRetries = 3;
      let subError = null;

      while (retryCount < maxRetries) {
        const { error } = await supabase
          .from('user_subscriptions')
          .insert([{
            user_id: user.id,
            subscription_id: subscriptionData.subscriptionId,
            paypal_subscription_id: subscriptionData.subscriptionId,
            plan_type: subscriptionData.planType || 'standard',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
          }]);
        
        if (!error) {
          // Success - clear pending subscription and show success message
          localStorage.removeItem('pending-subscription');
          console.log('Subscription activated successfully for user:', user.id, 'PayPal ID:', subscriptionData.subscriptionId);
          toast({
            title: "Subscription Activated! 🎉",
            description: "Welcome to EspaLuz Premium! Your subscription is now active.",
          });
          return;
        }

        subError = error;
        retryCount++;
        console.error(`Subscription activation attempt ${retryCount} failed:`, error);
        
        if (retryCount < maxRetries) {
          console.log(`Retrying subscription activation in ${retryCount * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
        }
      }

      // All retries failed - show detailed error with recovery instructions
      console.error('Failed to create subscription after', maxRetries, 'attempts:', subError);
      console.error('User ID:', user.id);
      console.error('Subscription data:', subscriptionData);
      
      // Don't clear localStorage so user can retry or support can recover
      toast({
        title: "Subscription Activation Error",
        description: `Your payment was successful but we couldn't activate your subscription. Please contact support with ID: ${subscriptionData.subscriptionId}`,
        variant: "destructive",
        duration: 10000 // Show longer for important error
      });

      // Store detailed error info for support
      const errorDetails = {
        userId: user.id,
        subscriptionId: subscriptionData.subscriptionId,
        error: subError?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        retryCount: maxRetries
      };
      localStorage.setItem('subscription-activation-error', JSON.stringify(errorDetails));
      
    } catch (error: any) {
      console.error('Error processing pending subscription:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        userId: user?.id
      });
      
      toast({
        title: "Subscription Processing Error",
        description: "There was an issue processing your subscription. Please contact support with the error details.",
        variant: "destructive",
        duration: 10000
      });

      // Store error details for debugging
      const errorDetails = {
        userId: user?.id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('subscription-processing-error', JSON.stringify(errorDetails));
    }
  };

  // Function to verify subscription activation after account creation
  const verifySubscriptionActivation = async (user: any) => {
    const pendingSubscription = localStorage.getItem('pending-subscription');
    if (!user || !pendingSubscription) return;

    try {
      const subscriptionData = JSON.parse(pendingSubscription);
      console.log('Verifying subscription activation for user:', user.id);

      // Check if subscription exists and is active
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select('id, status, plan_type, paypal_subscription_id')
        .eq('user_id', user.id)
        .eq('paypal_subscription_id', subscriptionData.subscriptionId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error verifying subscription:', error);
        return;
      }

      if (subscription) {
        console.log('Subscription verification successful:', subscription);
        // Clear pending subscription data since activation was verified
        localStorage.removeItem('pending-subscription');
        localStorage.removeItem('subscription-activation-error');
        localStorage.removeItem('subscription-processing-error');
        
        toast({
          title: "Subscription Verified! ✅",
          description: "Your subscription is active and ready to use.",
        });
      } else {
        console.warn('Subscription verification failed - no active subscription found');
        // Keep pending data for potential recovery
        toast({
          title: "Subscription Verification",
          description: "We're still processing your subscription. It should be active shortly.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error during subscription verification:', error);
    }
  };

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Check for referral code and subscription info in URL
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    const subscriptionStatus = urlParams.get('subscription');
    const emailParam = urlParams.get('email');
    const nameParam = urlParams.get('name');
    
    if (referralCode) {
      setFormData(prev => ({
        ...prev,
        referralCode: referralCode
      }));
    }
    
    // Pre-fill email and name if coming from subscription flow
    if (emailParam) {
      setFormData(prev => ({
        ...prev,
        email: decodeURIComponent(emailParam)
      }));
    }
    
    if (nameParam) {
      setFormData(prev => ({
        ...prev,
        fullName: decodeURIComponent(nameParam)
      }));
    }
    
    // Show message if coming from subscription flow
    if (subscriptionStatus === 'success') {
      toast({
        title: "Payment Successful! 🎉",
        description: "Your PayPal subscription is active. Now create your account to access EspaLuz.",
      });
    }
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else {
          setError(error.message);
        }
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        navigate('/dashboard');
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.fullName) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { user, error } = await signUp(
        formData.email, 
        formData.password, 
        formData.fullName
      );
      
      if (error) {
        if (error.message.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(error.message);
        }
      } else {
        // Process referral if user came from a referral link or entered a code
        if (user && formData.referralCode) {
          await processReferralSignup(user.id, formData.referralCode);
        }
        
        // Handle pending subscription if user came from PayPal flow
        if (user) {
          await handlePendingSubscriptionActivation(user);
          
          // Verify subscription activation after a short delay
          setTimeout(async () => {
            await verifySubscriptionActivation(user);
          }, 3000);
        }
        
        if (!localStorage.getItem('pending-subscription')) {
          toast({
            title: "Account created!",
            description: "Please check your email to confirm your account.",
          });
        }
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">EspaLuz</h1>
          </div>
          <p className="text-muted-foreground">
            Your AI Spanish tutor awaits
          </p>
        </div>

        {/* Show subscription recovery component if there are activation issues */}
        <div className="mb-6">
          <SubscriptionRecovery />
        </div>

        <Card className="border-border shadow-card">
          <CardHeader className="text-center">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in or try EspaLuz risk free without sign up
            </CardDescription>
            {new URLSearchParams(window.location.search).get('subscription') === 'success' && (
              <Alert className="mt-4 bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  🎉 Payment successful! Create your account below to activate your EspaLuz subscription.
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue={new URLSearchParams(window.location.search).get('subscription') === 'success' ? 'signup' : 'signin'} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    variant="hero"
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="Your full name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password (min. 6 characters)"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
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
                    <Label htmlFor="signup-referral">Referral Code (Optional)</Label>
                    <Input
                      id="signup-referral"
                      name="referralCode"
                      type="text"
                      placeholder="Enter referral code"
                      value={formData.referralCode}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    variant="hero"
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    By signing up, you agree to our Terms of Service and Privacy Policy
                  </p>
                </form>
              </TabsContent>
            </Tabs>
            
            {/* Try EspaLuz Risk Free Button */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button 
                onClick={() => navigate('/dashboard')} 
                variant="outline" 
                className="w-full bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-green-200 text-green-700 hover:text-green-800"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Try EspaLuz Risk Free - 20 Messages
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                No signup required • Full features included
              </p>
            </div>
          </CardContent>
        </Card>
        

      </div>
    </div>
  );
};

export default Auth;