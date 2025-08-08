
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { PAYPAL_CONFIG, getPayPalSDKUrl } from "@/config/paypal";
import { Link } from "react-router-dom";

interface PayPalButtonProps {
  planType: "standard" | "premium";
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: any) => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

const PayPalButton = ({ planType, onSuccess, onError }: PayPalButtonProps) => {
  const { toast } = useToast();
  const { createSubscription } = useSubscription();
  const { user } = useAuth();

  // Move all hooks to the top - they must always be called
  useEffect(() => {
    // Only initialize PayPal if user is authenticated and plan is available
    const plan = PAYPAL_CONFIG.plans[planType];
    if (!user || !plan?.id) {
      return;
    }

    // Clean up any existing PayPal buttons first
    const container = document.getElementById("paypal-button-container");
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
      const container = document.getElementById("paypal-button-container");
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [planType, user]);

  // If user is not authenticated, show login prompt instead of PayPal button
  if (!user) {
    return (
      <div className="w-full">
        <Link to="/auth">
          <Button variant="hero" size="lg" className="w-full">
            Sign In to Subscribe
          </Button>
        </Link>
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Please sign in to activate your subscription
          </p>
        </div>
      </div>
    );
  }

  // Check if plan is available
  const plan = PAYPAL_CONFIG.plans[planType];
  if (!plan?.id) {
    return (
      <div className="w-full">
        <Button variant="outline" size="lg" className="w-full" disabled>
          Setup Required
        </Button>
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            PayPal subscription plan needs to be created in PayPal Dashboard
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Visit PayPal Developer Dashboard → Products & Plans → Create Plan
          </p>
        </div>
      </div>
    );
  }

  const initializePayPal = () => {
    if (!window.paypal) {
      console.error('PayPal SDK not loaded');
      toast({
        title: "PayPal Error",
        description: "PayPal services are temporarily unavailable. Please try again later.",
        variant: "destructive"
      });
      return;
    }

    const planId = PAYPAL_CONFIG.plans[planType]?.id;
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
          height: 40
        },
        createSubscription: function(data: any, actions: any) {
          console.log('Creating PayPal subscription with plan ID:', planId);
          
          return actions.subscription.create({
            'plan_id': planId,
            'subscriber': {
              'name': {
                'given_name': user?.user_metadata?.full_name?.split(' ')[0] || 'EspaLuz',
                'surname': user?.user_metadata?.full_name?.split(' ')[1] || 'Subscriber'
              },
              'email_address': user?.email || ''
            },
            'application_context': {
              'brand_name': 'EspaLuz',
              'user_action': 'SUBSCRIBE_NOW',
              'payment_method': {
                'payer_selected': 'PAYPAL',
                'payee_preferred': 'IMMEDIATE_PAYMENT_REQUIRED'
              }
            }
          });
        },
        onApprove: async function(data: any, actions: any) {
          console.log('PayPal subscription approved:', data.subscriptionID);
          
          try {
            // Create subscription in our database
            const result = await createSubscription(data.subscriptionID);
            
            if (result?.error) {
              throw new Error('Failed to create subscription in database');
            }
            
            toast({
              title: "Subscription Activated!",
              description: "Welcome to EspaLuz Premium! Your subscription is now active.",
            });
            
            if (onSuccess) {
              onSuccess(data.subscriptionID);
            }
          } catch (error) {
            console.error('Database subscription creation failed:', error);
            toast({
              title: "Subscription Error",
              description: "Payment successful but there was an issue activating your subscription. Please contact support with subscription ID: " + data.subscriptionID,
              variant: "destructive"
            });
          }
        },
        onError: function(err: any) {
          console.error('PayPal Error Details:', err);
          
          let errorMessage = "Something went wrong with your subscription. Please try again.";
          
          if (err.message) {
            if (err.message.includes('plan')) {
              errorMessage = "Invalid subscription plan. Please contact support.";
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
            description: "Your subscription was cancelled.",
          });
        }
      }).render('#paypal-button-container');
    } catch (error) {
      console.error('PayPal button initialization failed:', error);
      toast({
        title: "PayPal Error",
        description: "Failed to initialize PayPal. Please refresh the page and try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-full">
      <div id="paypal-button-container" className="w-full min-h-[50px]">
        {/* PayPal button will render here */}
        <div className="flex items-center justify-center h-12 text-muted-foreground">
          Loading PayPal...
        </div>
      </div>
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          Secure payment powered by PayPal
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Plan: {PAYPAL_CONFIG.plans[planType]?.name} - {PAYPAL_CONFIG.plans[planType]?.price}
        </p>
        <p className="text-xs text-muted-foreground">
          Merchant ID: {PAYPAL_CONFIG.merchantId}
        </p>
      </div>
    </div>
  );
};

export default PayPalButton;
