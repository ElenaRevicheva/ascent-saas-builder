import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
    fullName: ''
  });
  // 4 Nov 2026: free sign-up (14-day trial, no card) + password reset. Before this, accounts were created only
  // after PayPal (SubscriptionComplete) and there was no way to recover a password.
  type Mode = 'signin' | 'signup' | 'forgot' | 'reset';
  const params = new URLSearchParams(window.location.search);
  const startsInRecovery = window.location.hash.includes('type=recovery') || params.get('mode') === 'reset';
  const [mode, setMode] = useState<Mode>(
    startsInRecovery ? 'reset' : params.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [notice, setNotice] = useState('');

  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  // The classroom sends parents here with ?next=/classroom (22 Oct 2026); only that page is allowed back.
  const afterSignIn = new URLSearchParams(window.location.search).get('next') === '/classroom' ? '/classroom' : '/dashboard';

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

      // All retries failed - show user-friendly message with recovery instructions
      console.error('Failed to create subscription after', maxRetries, 'attempts:', subError);
      console.error('User ID:', user.id);
      console.error('Subscription data:', subscriptionData);
      
      // Don't clear localStorage so user can retry or support can recover
      toast({
        title: "Almost There! 🔄",
        description: "Your payment was successful! We're just finishing up your subscription setup. You can retry below or it will complete automatically.",
        duration: 8000 // Show longer but less scary
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
        title: "Setting Up Your Subscription 🔄",
        description: "Your payment was successful! We're working on activating your subscription. Please check the options below.",
        duration: 8000
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
    if (user && mode !== 'reset') {
      navigate(afterSignIn);
    }
  }, [user, navigate, afterSignIn, mode]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('reset');
    });
    return () => subscription.unsubscribe();
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in your email and a password');
      return;
    }
    if (formData.password.length < 8) {
      setError('Please use at least 8 characters for your password');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const { error } = await signUp(formData.email.trim(), formData.password, formData.fullName.trim() || undefined);
      if (error) {
        setError(/registered|exists/i.test(error.message)
          ? 'This email already has an account. Please sign in, or reset your password.'
          : error.message);
      } else {
        setNotice(`Almost there! We sent a confirmation link to ${formData.email.trim()}. Open it, then sign in here. Your 14 free days start now.`);
        setMode('signin');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setError('Please type the email of your account');
      return;
    }
    setIsLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email.trim(), {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    setIsLoading(false);
    if (error) setError(error.message);
    else setNotice(`If ${formData.email.trim()} has an account, a link to choose a new password is on its way.`);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      setError('Please use at least 8 characters for your new password');
      return;
    }
    setIsLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password: formData.password });
    setIsLoading(false);
    if (error) {
      setError(error.message);
    } else {
      toast({ title: 'Password updated', description: 'Welcome back to EspaLuz.' });
      navigate(afterSignIn);
    }
  };

  useEffect(() => {
    // Pre-fill email if coming from subscription flow
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    
    if (emailParam) {
      setFormData(prev => ({
        ...prev,
        email: decodeURIComponent(emailParam)
      }));
    }
  }, []);

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
        navigate(afterSignIn);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  const passwordField = (id: string, placeholder: string) => (
    <div className="relative">
      <Input
        id={id}
        name="password"
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={formData.password}
        onChange={handleInputChange}
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        required
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={() => setShowPassword(!showPassword)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );

  const emailField = (
    <div className="space-y-2">
      <Label htmlFor="auth-email">Email</Label>
      <Input id="auth-email" name="email" type="email" placeholder="your@email.com" autoComplete="email"
        value={formData.email} onChange={handleInputChange} required />
    </div>
  );

  const titles: Record<Mode, { title: string; sub: string }> = {
    signin: { title: 'Welcome back', sub: 'Sign in to your family space' },
    signup: { title: 'Start free for 14 days', sub: 'No card needed. The classroom, your chat, WhatsApp and Telegram.' },
    forgot: { title: 'Forgot your password?', sub: 'Type your email and we will send you a link' },
    reset: { title: 'Choose a new password', sub: 'At least 8 characters' },
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
            <img src="/espaluz-icon.svg?v=el4" alt="" className="h-9 w-9" />
            <h1 className="text-2xl font-bold text-foreground">EspaLuz</h1>
          </div>
          <p className="text-muted-foreground">Live your new country in Spanish, with your family</p>
        </div>

        <div className="mb-6">
          <SubscriptionRecovery />
        </div>

        <Card className="border-border shadow-card">
          <CardHeader className="text-center">
            <CardTitle>{titles[mode].title}</CardTitle>
            <CardDescription>{titles[mode].sub}</CardDescription>
            {(mode === 'signin' || mode === 'signup') && (
              <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="tablist" aria-label="Sign in or create account">
                <button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => switchMode('signin')}
                  className={`rounded-full py-2 text-sm font-semibold ${mode === 'signin' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}>
                  Sign in
                </button>
                <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => switchMode('signup')}
                  className={`rounded-full py-2 text-sm font-semibold ${mode === 'signup' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}>
                  Create account
                </button>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {notice && (
              <Alert className="mb-6 border-[hsl(var(--espaluz-green))]">
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}

            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                {emailField}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auth-password">Password</Label>
                    <button type="button" onClick={() => switchMode('forgot')} className="text-sm font-medium text-primary hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  {passwordField('auth-password', 'Your password')}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} variant="hero">
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-name">Your name</Label>
                  <Input id="auth-name" name="fullName" placeholder="e.g. Ana" autoComplete="name"
                    value={formData.fullName} onChange={handleInputChange} />
                </div>
                {emailField}
                <div className="space-y-2">
                  <Label htmlFor="auth-password">Password</Label>
                  {passwordField('auth-password', 'At least 8 characters')}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} variant="hero">
                  {isLoading ? 'Creating your account...' : 'Create my free account'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  14 days free, then $11 a month only if you choose to stay. By creating an account you accept the{' '}
                  <Link to="/terms-of-service" className="underline">terms</Link> and{' '}
                  <Link to="/privacy-policy" className="underline">privacy policy</Link>.
                </p>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                {emailField}
                <Button type="submit" className="w-full" disabled={isLoading} variant="hero">
                  {isLoading ? 'Sending...' : 'Send me a link'}
                </Button>
                <button type="button" onClick={() => switchMode('signin')} className="w-full text-sm font-medium text-primary hover:underline">
                  Back to sign in
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-password">New password</Label>
                  {passwordField('auth-password', 'At least 8 characters')}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} variant="hero">
                  {isLoading ? 'Saving...' : 'Save new password'}
                </Button>
              </form>
            )}

            {(mode === 'signin' || mode === 'signup') && (
              <div className="mt-6 pt-4 border-t border-border">
                <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Just try 20 messages first
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">No account needed</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;