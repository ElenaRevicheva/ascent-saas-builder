import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { manuallyActivateSubscription } from '@/utils/subscriptionRecovery';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const SubscriptionRecoveryTool = () => {
  const [userEmail, setUserEmail] = useState('');
  const [paypalSubscriptionId, setPaypalSubscriptionId] = useState('');
  const [planType, setPlanType] = useState<'standard' | 'premium'>('standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);
  const { toast } = useToast();

  const handleRecoverSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userEmail || !paypalSubscriptionId) {
      toast({
        title: "Missing Information",
        description: "Please provide both user email and PayPal subscription ID.",
        variant: "destructive"
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      console.log('Attempting manual subscription recovery:', {
        userEmail,
        paypalSubscriptionId,
        planType
      });

      const recoveryResult = await manuallyActivateSubscription(
        userEmail,
        paypalSubscriptionId,
        planType
      );

      setResult(recoveryResult);

      if (recoveryResult.success) {
        toast({
          title: "Subscription Recovered! 🎉",
          description: "The subscription has been successfully activated for the user.",
        });
        
        // Clear form on success
        setUserEmail('');
        setPaypalSubscriptionId('');
        setPlanType('standard');
      } else {
        toast({
          title: "Recovery Failed",
          description: recoveryResult.error || "Unable to recover subscription.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Recovery tool error:', error);
      setResult({
        success: false,
        message: '',
        error: error.message || 'Unexpected error occurred'
      });
      
      toast({
        title: "Recovery Error",
        description: "An unexpected error occurred during recovery.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Subscription Recovery Tool
        </CardTitle>
        <CardDescription>
          Manually activate subscriptions for users who experienced activation failures after successful PayPal payments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRecoverSubscription} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="user-email">User Email Address</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="user@example.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              required
              disabled={isProcessing}
            />
            <p className="text-sm text-muted-foreground">
              The email address of the user who needs subscription recovery
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paypal-subscription-id">PayPal Subscription ID</Label>
            <Input
              id="paypal-subscription-id"
              type="text"
              placeholder="I-BW452GLLEP1G"
              value={paypalSubscriptionId}
              onChange={(e) => setPaypalSubscriptionId(e.target.value)}
              required
              disabled={isProcessing}
            />
            <p className="text-sm text-muted-foreground">
              The PayPal subscription ID from the successful payment (usually starts with "I-")
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-type">Plan Type</Label>
            <Select value={planType} onValueChange={(value: 'standard' | 'premium') => setPlanType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Plan</SelectItem>
                <SelectItem value="premium">Premium Plan</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The subscription plan the user paid for
            </p>
          </div>

          {result && (
            <Alert className={result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                  {result.success ? (
                    <div>
                      <strong>Success:</strong> {result.message}
                      <br />
                      <span className="text-sm">The user's subscription has been activated and they should now have access to premium features.</span>
                    </div>
                  ) : (
                    <div>
                      <strong>Failed:</strong> {result.error}
                      <br />
                      <span className="text-sm">Please check the user email and PayPal subscription ID, then try again.</span>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Recovering Subscription...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Recover Subscription
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">How to use this tool:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
            <li>Get the user's email address and PayPal subscription ID from their support request</li>
            <li>Verify the PayPal payment was successful in the PayPal dashboard</li>
            <li>Enter the information above and select the correct plan type</li>
            <li>Click "Recover Subscription" to manually activate their subscription</li>
            <li>Inform the user that their subscription has been activated</li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-2">Important Notes:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
            <li>Only use this tool for confirmed successful PayPal payments</li>
            <li>The tool will check for duplicate subscriptions before creating a new one</li>
            <li>Users must have already created their account before recovery</li>
            <li>The subscription will be activated for 30 days from the recovery date</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionRecoveryTool;