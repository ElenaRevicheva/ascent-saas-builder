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

  useEffect(() => {
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
  }, [planType]); // Re-initialize when planType changes

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
          const planId = PAYPAL_CONFIG.plans[planType]?.id;
          if (!planId || planId.includes('XX') || planId === null) {
            console.error('Invalid PayPal plan ID:', planId, 'for plan type:', planType);
            const errorMsg = planType === 'premium' 
              ? 'Premium plan is coming soon! Please try the Standard plan.' 
              : `Invalid PayPal plan ID for ${planType}. Please contact support.`;
            throw new Error(errorMsg);
          }
          
          console.log('Creating PayPal subscription with plan ID:', planId);
          
          return actions.subscription.create({
            'plan_id': planId,
            'subscriber': {
              'name': {
                'given_name': 'EspaLuz',
                'surname': 'Subscriber'
              }
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
              description: "Payment successful but there was an issue activating your subscription. Please contact support.",
              variant: "destructive"
            });
          }
        },
        onError: function(err: any) {
          console.error('PayPal Error Details:', err);
          
          let errorMessage = "Something went wrong with your subscription. Please try again.";
          
          if (err.message && err.message.includes('plan')) {
            errorMessage = "Invalid subscription plan. Please contact support.";
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