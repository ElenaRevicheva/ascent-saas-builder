import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';

const SubscriptionRecovery = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRetryAttempted, setAutoRetryAttempted] = useState(false);
  type RecoveryStatus = 'idle' | 'success' | 'failed';
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>('idle');
  const { toast } = useToast();
  const { user } = useAuth();

  // Get error details from localStorage
  const getErrorDetails = () => {
    try {
      const activationError = localStorage.getItem('subscription-activation-error');
      const processingError = localStorage.getItem('subscription-processing-error');
      const pendingSubscription = localStorage.getItem('pending-subscription');

      return {
        activationError: activationError ? JSON.parse(activationError) : null,
        processingError: processingError ? JSON.parse(processingError) : null,
        pendingSubscription: pendingSubscription ? JSON.parse(pendingSubscription) : null
      };
    } catch (error) {
      console.error('Error parsing recovery data:', error);
      return { activationError: null, processingError: null, pendingSubscription: null };
    }
  };

  const { activationError, processingError, pendingSubscription } = getErrorDetails();

  // Automatic retry effect - attempt once automatically after 3 seconds
  useEffect(() => {
    if (user && pendingSubscription && !autoRetryAttempted && !isRetrying && recoveryStatus === 'idle') {
      const timer = setTimeout(() => {
        console.log('Attempting automatic subscription recovery...');
        setAutoRetryAttempted(true);
        retrySubscriptionActivation();
      }, 3000); // Wait 3 seconds before auto-retry

      return () => clearTimeout(timer);
    }
  }, [user, pendingSubscription, autoRetryAttempted, isRetrying, recoveryStatus]);

  // Don't show recovery component if no error data or no user
  if (!user || (!activationError && !processingError && !pendingSubscription)) {
    return null;
  }

  const retrySubscriptionActivation = async () => {
    if (!user || !pendingSubscription) {
      toast({
        title: "Cannot Retry",
        description: "Missing user or subscription information. Please contact support.",
        variant: "destructive"
      });
      return;
    }

    setIsRetrying(true);

    try {
      console.log('Retrying subscription activation for user:', user.id);
      console.log('Subscription data:', pendingSubscription);

      // Check if subscription already exists
      const { data: existingSub, error: checkError } = await supabase
        .from('user_subscriptions')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('paypal_subscription_id', pendingSubscription.subscriptionId)
        .maybeSingle();

      if (checkError) {
        throw new Error(`Database check failed: ${checkError.message}`);
      }

      if (existingSub) {
        console.log('Subscription already exists:', existingSub);
        // Clear error data
        localStorage.removeItem('subscription-activation-error');
        localStorage.removeItem('subscription-processing-error');
        localStorage.removeItem('pending-subscription');
        
        setRecoveryStatus('success');
        toast({
          title: "Subscription Found! 🎉",
          description: "Your subscription is already active. Refreshing page...",
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }

      // Attempt to create subscription
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert([{
          user_id: user.id,
          subscription_id: pendingSubscription.subscriptionId,
          paypal_subscription_id: pendingSubscription.subscriptionId,
          plan_type: pendingSubscription.planType || 'standard',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }]);

      if (insertError) {
        throw insertError;
      }

      // Success - clear all error data
      localStorage.removeItem('subscription-activation-error');
      localStorage.removeItem('subscription-processing-error');
      localStorage.removeItem('pending-subscription');

      setRecoveryStatus('success');
      toast({
        title: "Subscription Activated! 🎉",
        description: "Your subscription has been successfully activated. Refreshing page...",
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Retry failed:', error);
      setRecoveryStatus('failed');
      toast({
        title: "Retry Failed",
        description: `Unable to activate subscription: ${error.message}. Please contact support.`,
        variant: "destructive"
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const contactSupport = () => {
    const errorData = {
      userId: user.id,
      email: user.email,
      subscriptionId: pendingSubscription?.subscriptionId || activationError?.subscriptionId,
      activationError,
      processingError,
      pendingSubscription,
      timestamp: new Date().toISOString()
    };

    // Copy error data to clipboard for easy sharing with support
    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2))
      .then(() => {
        toast({
          title: "Error Details Copied",
          description: "Error details have been copied to your clipboard. Please include this when contacting support.",
        });
      })
      .catch(() => {
        console.log('Error data for support:', errorData);
        toast({
          title: "Error Details Available",
          description: "Check the browser console for error details to share with support.",
        });
      });
  };

  if (recoveryStatus === 'success') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-800">Subscription Recovered!</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-green-700">Your subscription has been successfully activated. The page will refresh shortly.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-blue-800">Finalizing Your Subscription 🔄</CardTitle>
        </div>
        <CardDescription className="text-blue-700">
          Great news! Your PayPal payment was successful. We're just finishing up your subscription setup.
          {!autoRetryAttempted && !isRetrying && (
            <span className="block mt-2 text-sm font-medium">⏳ Auto-completing in a few seconds...</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingSubscription && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              <strong>Payment Details:</strong><br />
              Subscription ID: {pendingSubscription.subscriptionId}<br />
              Plan: {pendingSubscription.planType}<br />
              Email: {pendingSubscription.email}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={retrySubscriptionActivation}
            disabled={isRetrying || (recoveryStatus as RecoveryStatus) === 'success'}
            className="flex items-center gap-2"
            variant="default"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Completing Setup...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Complete Setup
              </>
            )}
          </Button>

          <Button
            onClick={contactSupport}
            variant="outline"
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Contact Support
          </Button>
        </div>

        {recoveryStatus === 'failed' && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-yellow-800">
              The setup is taking a bit longer than usual. Our support team can complete this for you quickly - just click "Contact Support" above.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>What's happening?</strong></p>
          <p>Your PayPal payment was processed successfully! We're just completing the final setup steps for your subscription.</p>
          <br />
          <p><strong>What to do:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click "Complete Setup" above to finish the process</li>
            <li>This usually completes in seconds</li>
            <li>If you need help, our support team is ready to assist</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionRecovery;