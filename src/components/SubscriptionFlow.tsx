import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PAYPAL_CONFIG, getPayPalSDKUrl } from "@/config/paypal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SubscriptionFlowProps {
  planType: "standard" | "premium";
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: any) => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

const SubscriptionFlow = ({ planType, onSuccess, onError }: SubscriptionFlowProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPayPal, setShowPayPal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const plan = PAYPAL_CONFIG.plans[planType];

  useEffect(() => {
    if (!showPayPal || !email || !fullName) return;
    
    // Clean up any existing PayPal buttons first
    const container = document.getElementById("subscription-paypal-button-container");
    if (container) {
      container.innerHTML = "";
    }

    // Load PayPal SDK if not already loaded
    if (!window.paypal) {
      const script = document.createElement("script");
      script.src = getPayPalSDKUrl();
      script.async = true;
      script.onload = () => {
        console.log('PayPal SDK loaded successfully');
        initializePayPal();
      };
      script.onerror = () => {
        console.error('Failed to load PayPal SDK');
        toast({
          title: "PayPal Error",
          description: "Failed to load PayPal services. Please check your internet connection and try again.",
          variant: "destructive"
        });
      };
      document.body.appendChild(script);
    } else {
      console.log('PayPal SDK already loaded');
      initializePayPal();
    }

    return () => {
      // Cleanup PayPal button container
      const container = document.getElementById("subscription-paypal-button-container");
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [showPayPal, email, fullName, planType, toast]);

  const initializePayPal = async () => {
    if (!window.paypal) {
      console.error('PayPal SDK not loaded');
      toast({
        title: "PayPal Error",
        description: "PayPal services are temporarily unavailable. Please try again later.",
        variant: "destructive"
      });
      return;
    }

    const planId = plan?.id;
    if (!planId) {
      console.error('Invalid PayPal plan ID:', planId);
      toast({
        title: "Configuration Error",
        description: `${planType} plan is not available yet. Please contact support.`,
        variant: "destructive"
      });
      return;
    }

    try {
      window.paypal.Buttons({
        style: {
          shape: 'rect',
          color: 'blue',
          layout: 'vertical',
          label: 'subscribe',
          height: 50
        },
        createSubscription: function(data: any, actions: any) {
          console.log('Creating PayPal subscription with plan ID:', planId);
          console.log('User email:', email);
          console.log('Environment:', PAYPAL_CONFIG.environment);
          
          const subscriptionData = {
            'plan_id': planId,
            'subscriber': {
              'name': {
                'given_name': fullName.split(' ')[0] || 'EspaLuz',
                'surname': fullName.split(' ')[1] || 'User'
              },
              'email_address': email
            },
            'application_context': {
              'brand_name': 'EspaLuz',
              'user_action': 'SUBSCRIBE_NOW',
              'return_url': window.location.origin + '/subscription-complete',
              'cancel_url': window.location.origin + '/#pricing'
            }
          };
          
          console.log('Subscription data:', subscriptionData);
          
          return actions.subscription.create(subscriptionData);
        },
        onApprove: async function(data: any, actions: any) {
          console.log('PayPal subscription approved:', data.subscriptionID);
          
          try {
            // Store subscription info temporarily for account creation
            const subscriptionInfo = {
              subscriptionId: data.subscriptionID,
              email: email,
              fullName: fullName,
              planType: planType,
              timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('pending-subscription', JSON.stringify(subscriptionInfo));
            
            toast({
              title: "Payment Successful!",
              description: "Now please create your account to access EspaLuz.",
            });
            
            // Redirect to streamlined subscription complete page
            window.location.href = '/subscription-complete';
            
            if (onSuccess) {
              onSuccess(data.subscriptionID);
            }
          } catch (error) {
            console.error('Subscription processing failed:', error);
            toast({
              title: "Subscription Error",
              description: "Payment successful but there was an issue. Please contact support with subscription ID: " + data.subscriptionID,
              variant: "destructive"
            });
          }
        },
        onError: function(err: any) {
          console.error('PayPal Error Details:', err);
          
          let errorMessage = "Something went wrong with your subscription. Please try again.";
          
          if (err.message) {
            if (err.message.includes('plan') || err.message.includes('PLAN')) {
              errorMessage = "Invalid subscription plan. The plan may not exist in this environment. Please contact support.";
            } else if (err.message.includes('payment')) {
              errorMessage = "Payment processing failed. Please check your payment method.";
            } else if (err.message.includes('network')) {
              errorMessage = "Network error. Please check your internet connection.";
            }
          }
          
          toast({
            title: "Payment Error",
            description: errorMessage,
            variant: "destructive"
          });
          
          if (onError) {
            onError(err);
          }
        },
        onCancel: function(data: any) {
          console.log('PayPal subscription cancelled by user');
          toast({
            title: "Payment Cancelled",
            description: "Your subscription was cancelled. You can try again anytime.",
          });
        }
      }).render('#subscription-paypal-button-container');
    } catch (error) {
      console.error('PayPal button initialization failed:', error);
      toast({
        title: "PayPal Error",
        description: "Failed to initialize PayPal. Please refresh the page and try again.",
        variant: "destructive"
      });
    }
  };

  const handleContinueToPayment = () => {
    if (!email || !fullName) {
      toast({
        title: "Required Information",
        description: "Please enter your email and full name to continue.",
        variant: "destructive"
      });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }
    
    if (fullName.trim().length < 2) {
      toast({
        title: "Invalid Name",
        description: "Please enter your full name.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setShowPayPal(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  if (!plan?.id) {
    return (
      <div className="w-full">
        <Button variant="outline" size="lg" className="w-full" disabled>
          Coming Soon
        </Button>
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            This plan is not available yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {!showPayPal ? (
        <Card>
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-2xl font-bold text-primary">{plan.name}</CardTitle>
            <p className="text-3xl font-bold text-foreground">
              ${plan.price}/month
            </p>
            
            <p className="text-lg font-semibold text-primary">
              🎯 Full EspaLuz Dashboard Experience - Unlimited Learning!
            </p>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-800">
                🛡️ Secure payment powered by PayPal
              </p>
              <p className="text-xs text-green-600">
                Merchant ID: P8TXABNT28ZXG
              </p>
              <p className="text-sm font-bold text-green-700">
                🎁 BONUS: 1 week free trial after PayPal onboarding confirmation
              </p>
            </div>
            
            <div className="mt-6">
              <h3 className="text-xl font-bold text-primary mb-2">Subscribe to EspaLuz Standard</h3>
              <p className="text-lg font-semibold text-foreground">
                ${plan.price}/month - Start your unlimited bilingual Journey
              </p>
            </div>
            
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                🎯 Step 1: Enter your details and complete PayPal onboarding
              </p>
              <p className="text-sm font-medium text-purple-700 bg-purple-50 px-3 py-2 rounded-lg">
                🔐 Step 2: Your account will be automatically created after onboarding confirmation
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subscription-email">Email Address</Label>
              <Input
                id="subscription-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subscription-fullName">Full Name</Label>
              <Input
                id="subscription-fullName"
                type="text"
                placeholder="Your Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <Button 
              onClick={handleContinueToPayment}
              className="w-full bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Continue to PayPal Payment"}
            </Button>
            

          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Complete Your Payment</CardTitle>
            <div className="space-y-2">
              <p className="text-sm font-medium">{fullName}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
              <p className="text-sm text-muted-foreground">
                {plan.name} - ${plan.price}/month
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPayPal(false)}
                className="text-xs"
              >
                Edit Info
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div id="subscription-paypal-button-container" className="w-full min-h-[60px]">
              <div className="flex items-center justify-center h-12 text-muted-foreground">
                Loading PayPal...
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Secure payment powered by PayPal
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                After payment, you'll be redirected to create your account
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionFlow;