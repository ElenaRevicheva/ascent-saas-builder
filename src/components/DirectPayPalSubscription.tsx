import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PAYPAL_CONFIG, getPayPalSDKUrl } from "@/config/paypal";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DirectPayPalSubscriptionProps {
  planType: "standard" | "premium";
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: any) => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

const DirectPayPalSubscription = ({ planType, onSuccess, onError }: DirectPayPalSubscriptionProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPayPal, setShowPayPal] = useState(false);

  const plan = PAYPAL_CONFIG.plans[planType];

  useEffect(() => {
    if (!showPayPal || !email || !fullName) return;
    
    // Clean up any existing PayPal buttons first
    const container = document.getElementById("direct-paypal-button-container");
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
      const container = document.getElementById("direct-paypal-button-container");
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
              'return_url': window.location.origin + '/auth?subscription=success',
              'cancel_url': window.location.origin + '/#pricing'
            }
          };
          
          console.log('Subscription data:', subscriptionData);
          
          return actions.subscription.create(subscriptionData);
        },
        onApprove: async function(data: any, actions: any) {
          console.log('PayPal subscription approved:', data.subscriptionID);
          
          try {
            // Store subscription info temporarily and redirect to auth for account creation
            localStorage.setItem('pending-subscription', JSON.stringify({
              subscriptionId: data.subscriptionID,
              email: email,
              fullName: fullName,
              planType: planType
            }));
            
            toast({
              title: "Payment Successful!",
              description: "Please create your account to activate your subscription.",
            });
            
            // Redirect to auth page with subscription success flag
            window.location.href = '/auth?subscription=pending&email=' + encodeURIComponent(email);
            
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
            description: "Your subscription was cancelled.",
          });
        }
      }).render('#direct-paypal-button-container');
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
    
    setShowPayPal(true);
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Subscribe to {plan.name}</CardTitle>
        <p className="text-center text-sm text-muted-foreground">
          ${plan.price}/month - Start your unlimited EspaLuz experience
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showPayPal ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Your Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            
            <Button 
              onClick={handleContinueToPayment}
              className="w-full bg-[hsl(var(--espaluz-primary))] hover:bg-[hsl(var(--espaluz-primary))]/90"
              size="lg"
            >
              Continue to Payment
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              You'll create your account after payment confirmation
            </p>
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="font-medium">Ready to subscribe!</p>
              <p className="text-sm text-muted-foreground">
                {fullName} ({email})
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
            
            <div id="direct-paypal-button-container" className="w-full min-h-[60px]">
              <div className="flex items-center justify-center h-12 text-muted-foreground">
                Loading PayPal...
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Secure payment powered by PayPal
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Plan: {plan.name} - ${plan.price}/month
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DirectPayPalSubscription;