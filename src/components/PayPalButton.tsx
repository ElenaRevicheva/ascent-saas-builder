import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PayPalButtonProps {
  planType: "monthly";
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

  useEffect(() => {
    // Load PayPal SDK
    if (!window.paypal) {
      const script = document.createElement("script");
      script.src = "https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&vault=true&intent=subscription";
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
        return actions.subscription.create({
          'plan_id': 'P-7XX77777XX777777X', // This will be your PayPal subscription plan ID
          'subscriber': {
            'name': {
              'given_name': 'Elena',
              'surname': 'Revicheva'
            }
          }
        });
      },
      onApprove: function(data: any, actions: any) {
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
          Merchant ID: P8TXABNT28ZXG
        </p>
      </div>
    </div>
  );
};

export default PayPalButton;