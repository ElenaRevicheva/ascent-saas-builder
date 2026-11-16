import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SubscriptionRecovery = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRetryAttempted, setAutoRetryAttempted] = useState(false);
  type RecoveryStatus = 'idle' | 'success' | 'failed';
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>('idle');
  const { t } = useTranslation();
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
        title: t('rec.cannotRetryTitle'),
        description: t('rec.cannotRetryBody'),
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
          title: t('rec.foundTitle'),
          description: t('rec.foundBody'),
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
        title: t('rec.activatedTitle'),
        description: t('rec.activatedBody'),
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Retry failed:', error);
      setRecoveryStatus('failed');
      toast({
        title: t('rec.failedTitle'),
        description: t('rec.failedBody', { message: error.message }),
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
          title: t('rec.copiedTitle'),
          description: t('rec.copiedBody'),
        });
      })
      .catch(() => {
        console.log('Error data for support:', errorData);
        toast({
          title: t('rec.consoleTitle'),
          description: t('rec.consoleBody'),
        });
      });
  };

  if (recoveryStatus === 'success') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-800">{t('rec.recoveredTitle')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-green-700">{t('rec.recoveredBody')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-blue-800">{t('rec.finalizingTitle')}</CardTitle>
        </div>
        <CardDescription className="text-blue-700">
          {t('rec.finalizingBody')}
          {!autoRetryAttempted && !isRetrying && (
            <span className="block mt-2 text-sm font-medium">{t('rec.autoCompleting')}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingSubscription && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              <strong>{t('rec.paymentDetails')}</strong><br />
              {t('rec.subscriptionId')} {pendingSubscription.subscriptionId}<br />
              {t('rec.plan')} {pendingSubscription.planType}<br />
              {t('rec.email')} {pendingSubscription.email}
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
                {t('rec.completing')}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {t('rec.complete')}
              </>
            )}
          </Button>

          <Button
            onClick={contactSupport}
            variant="outline"
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            {t('rec.contactSupport')}
          </Button>
        </div>

        {recoveryStatus === 'failed' && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-yellow-800">
              {t('rec.slowBody')}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>{t('rec.whatsHappening')}</strong></p>
          <p>{t('rec.whatsHappeningBody')}</p>
          <br />
          <p><strong>{t('rec.whatToDo')}</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t('rec.step1')}</li>
            <li>{t('rec.step2')}</li>
            <li>{t('rec.step3')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionRecovery;