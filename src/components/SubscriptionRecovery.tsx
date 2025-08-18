import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';

const SubscriptionRecovery = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'success' | 'failed'>('idle');
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
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-orange-800">Subscription Activation Issue</CardTitle>
        </div>
        <CardDescription className="text-orange-700">
          We detected that your PayPal payment was successful but your subscription wasn't activated properly.
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
            disabled={isRetrying || recoveryStatus === 'success'}
            className="flex items-center gap-2"
            variant="default"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Retry Activation
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
          <Alert variant="destructive">
            <AlertDescription>
              The retry attempt failed. Please contact support with the error details for manual activation.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>What happened?</strong></p>
          <p>Your PayPal payment was processed successfully, but there was a technical issue preventing your subscription from being activated in our system.</p>
          <br />
          <p><strong>Next steps:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Try the "Retry Activation" button above</li>
            <li>If that doesn't work, click "Contact Support" to get help</li>
            <li>Your payment is safe and we'll make sure your subscription gets activated</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionRecovery;