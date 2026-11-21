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
import { signupErrorKind, track } from '@/lib/track';
import { Eye, EyeOff, ArrowLeft, Sparkles } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import SubscriptionRecovery from '@/components/SubscriptionRecovery';
import { AFTER_AUTH_PAGES } from '@/lib/afterAuth';

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

  const { t } = useTranslation();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  // The classroom sends parents here with ?next=/classroom (22 Oct 2026). 21 Nov 2026 (Elena: "I click try it on Pro English,
  // sign in, and land on the general dashboard - stuck"): every page that sends people to sign in gets them back. Only the
  // AFTER_AUTH_PAGES are allowed (no open redirect). Remembered for the e-mail confirmation link too (AuthConfirm).
  const askedNext = new URLSearchParams(window.location.search).get('next') ?? '';
  const afterSignIn = AFTER_AUTH_PAGES.includes(askedNext) ? askedNext : '/dashboard';
  useEffect(() => {
    try { if (afterSignIn !== '/dashboard') localStorage.setItem('espaluz_after_auth', afterSignIn); } catch { /* private mode */ }
  }, [afterSignIn]);

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
          title: t('auth.subAlreadyTitle'),
          description: t('auth.subAlreadyBody'),
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
            title: t('auth.subActivatedTitle'),
            description: t('auth.subActivatedBody'),
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
        title: t('auth.almostTitle'),
        description: t('auth.almostBody'),
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
        title: t('auth.settingUpTitle'),
        description: t('auth.settingUpBody'),
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
          title: t('auth.verifiedTitle'),
          description: t('auth.verifiedBody'),
        });
      } else {
        console.warn('Subscription verification failed - no active subscription found');
        // Keep pending data for potential recovery
        toast({
          title: t('auth.verifyingTitle'),
          description: t('auth.verifyingBody'),
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
      setError(t('auth.errEmailPassword'));
      return;
    }
    if (formData.password.length < 8) {
      setError(t('auth.errShortPassword'));
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const { error, user } = await signUp(formData.email.trim(), formData.password, formData.fullName.trim() || undefined);
      // 16 Nov 2026 (Elena's second tester account): an email that ALREADY has an account gets no error and no mail from
      // Supabase (auth log: user_repeated_signup) - it returns a user with no identities. The page used to say "we sent a
      // confirmation link", so the person waited for a mail that never comes. Say the truth: sign in or reset.
      if (!error && user && Array.isArray(user.identities) && user.identities.length === 0) {
        track('app_signup_error', { kind: 'already_exists' });
        setError(t('auth.errEmailTaken'));
        setMode('signin');
        return;
      }
      if (error) {
        track('app_signup_error', { kind: signupErrorKind(error.message) });
        setError(/registered|exists/i.test(error.message)
          ? t('auth.errEmailTaken')
          : error.message);
      } else {
        track('app_signup_sent');
        setNotice(t('auth.noticeConfirm', { email: formData.email.trim() }));
        setMode('signin');
      }
    } catch {
      setError(t('auth.errUnexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setError(t('auth.errNoEmail'));
      return;
    }
    setIsLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email.trim(), {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    setIsLoading(false);
    if (error) setError(error.message);
    else setNotice(t('auth.noticeReset', { email: formData.email.trim() }));
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      setError(t('auth.errShortNewPassword'));
      return;
    }
    setIsLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password: formData.password });
    setIsLoading(false);
    if (error) {
      setError(error.message);
    } else {
      toast({ title: t('auth.pwUpdatedTitle'), description: t('auth.pwUpdatedBody') });
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
      setError(t('auth.errAllFields'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError(t('auth.errInvalid'));
        } else if (error.message.includes('Email not confirmed')) {
          track('app_signin_unconfirmed');
          setError(t('auth.errUnconfirmed'));
        } else {
          setError(error.message);
        }
      } else {
        track('app_signin');
        toast({
          title: t('auth.signedInTitle'),
          description: t('auth.signedInBody'),
        });
        navigate(afterSignIn);
      }
    } catch (error) {
      setError(t('auth.errUnexpected'));
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
        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );

  const emailField = (
    <div className="space-y-2">
      <Label htmlFor="auth-email">{t('auth.email')}</Label>
      <Input id="auth-email" name="email" type="email" placeholder={t('auth.emailPlaceholder')} autoComplete="email"
        value={formData.email} onChange={handleInputChange} required />
    </div>
  );

  const titles: Record<Mode, { title: string; sub: string }> = {
    signin: { title: t('auth.signinTitle'), sub: t('auth.signinSub') },
    signup: { title: t('auth.signupTitle'), sub: t('auth.signupSub') },
    forgot: { title: t('auth.forgotTitle'), sub: t('auth.forgotSub') },
    reset: { title: t('auth.resetTitle'), sub: t('auth.min8') },
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
            <ArrowLeft className="h-4 w-4" />
            {t('auth.backHome')}
          </Link>
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/espaluz-icon.svg?v=el4" alt="" className="h-9 w-9" />
            <h1 className="text-2xl font-bold text-foreground">EspaLuz</h1>
          </div>
          <p className="text-muted-foreground">{t('auth.tagline')}</p>
        </div>

        <div className="mb-6">
          <SubscriptionRecovery />
        </div>

        <Card className="border-border shadow-card">
          <CardHeader className="text-center">
            <CardTitle>{titles[mode].title}</CardTitle>
            <CardDescription>{titles[mode].sub}</CardDescription>
            {(mode === 'signin' || mode === 'signup') && (
              <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="tablist" aria-label={t('auth.tabsLabel')}>
                <button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => switchMode('signin')}
                  className={`rounded-full py-2 text-sm font-semibold ${mode === 'signin' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}>
                  {t('auth.signIn')}
                </button>
                <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => switchMode('signup')}
                  className={`rounded-full py-2 text-sm font-semibold ${mode === 'signup' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}>
                  {t('auth.createAccount')}
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
                    <Label htmlFor="auth-password">{t('auth.password')}</Label>
                    <button type="button" onClick={() => switchMode('forgot')} className="text-sm font-medium text-primary hover:underline">
                      {t('auth.forgotLink')}
                    </button>
                  </div>
                  {passwordField('auth-password', t('auth.passwordPlaceholder'))}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} variant="hero">
                  {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                </Button>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-name">{t('auth.name')}</Label>
                  <Input id="auth-name" name="fullName" placeholder={t('auth.namePlaceholder')} autoComplete="name"
                    value={formData.fullName} onChange={handleInputChange} />
                </div>
                {emailField}
                <div className="space-y-2">
                  <Label htmlFor="auth-password">{t('auth.password')}</Label>
                  {passwordField('auth-password', t('auth.min8'))}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} variant="hero">
                  {isLoading ? t('auth.creating') : t('auth.createFree')}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  <Trans i18nKey="auth.terms" components={{
                    terms: <Link to="/terms-of-service" className="underline" />,
                    privacy: <Link to="/privacy-policy" className="underline" />,
                  }} />
                </p>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                {emailField}
                <Button type="submit" className="w-full" disabled={isLoading} variant="hero">
                  {isLoading ? t('auth.sending') : t('auth.sendLink')}
                </Button>
                <button type="button" onClick={() => switchMode('signin')} className="w-full text-sm font-medium text-primary hover:underline">
                  {t('auth.backToSignIn')}
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-password">{t('auth.newPassword')}</Label>
                  {passwordField('auth-password', t('auth.min8'))}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} variant="hero">
                  {isLoading ? t('auth.saving') : t('auth.saveNewPassword')}
                </Button>
              </form>
            )}

            {(mode === 'signin' || mode === 'signup') && (
              <p className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
                {t('auth.notReady')}{' '}
                <button type="button" onClick={() => navigate('/dashboard')} className="font-semibold text-primary hover:underline">
                  {t('auth.tryWithout')}
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;