import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { PAYPAL_CONFIG, getPayPalSDKUrl } from "@/config/paypal";

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

  useEffect(() => {
    // Load PayPal SDK
    if (!window.paypal) {
      const script = document.createElement("script");
      script.src = getPayPalSDKUrl();
      script.async = true;
      script.onload = initializePayPal;
      document.body.appendChild(script);
    } else {
      initializePayPal();
    }

    return () => {
      // Cleanup PayPal button container
      const container = document.getElementById("paypal-button-container");
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  const initializePayPal = () => {
    if (!window.paypal) return;

    window.paypal.Buttons({
      style: {
        shape: 'rect',
        color: 'blue',
        layout: 'vertical',
        label: 'subscribe'
      },
      createSubscription: function(data: any, actions: any) {
        const planId = PAYPAL_CONFIG.plans[planType]?.id;
        if (!planId) {
          throw new Error(`No PayPal plan ID found for ${planType}`);
        }
        
        return actions.subscription.create({
          'plan_id': planId,
          'subscriber': {
            'name': {
              'given_name': 'EspaLuz',
              'surname': 'Subscriber'
            }
          }
        });
      },
      onApprove: function(data: any, actions: any) {
        // Create subscription in our database
        createSubscription(data.subscriptionID);
        
        toast({
          title: "Subscription Activated!",
          description: "Welcome to EspaLuz Premium! Your subscription is now active.",
        });
        
        if (onSuccess) {
          onSuccess(data.subscriptionID);
        }
      },
      onError: function(err: any) {
        console.error('PayPal Error:', err);
        toast({
          title: "Payment Error",
          description: "Something went wrong with your subscription. Please try again.",
          variant: "destructive"
        });
        
        if (onError) {
          onError(err);
        }
      },
      onCancel: function(data: any) {
        toast({
          title: "Payment Cancelled",
          description: "Your subscription was cancelled.",
        });
      }
    }).render('#paypal-button-container');
  };

  return (
    <div className="w-full">
      <div id="paypal-button-container" className="w-full min-h-[50px]">
        {/* PayPal button will render here */}
      </div>
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          Secure payment powered by PayPal
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Merchant ID: {PAYPAL_CONFIG.merchantId}
        </p>
      </div>
    </div>
  );
};

export default PayPalButton;