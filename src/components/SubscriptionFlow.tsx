import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PAYPAL_CONFIG, getPayPalSDKUrl } from "@/config/paypal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaySubscribe } from "@/components/PlaySubscribe";
import { insidePlayApp } from "@/lib/playBilling";

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

const PayPalSubscriptionFlow = ({ planType, onSuccess, onError }: SubscriptionFlowProps) => {
  const { t } = useTranslation();
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
          title: t("sf.ppError"),
          description: t("sf.ppLoad"),
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
        title: t("sf.ppError"),
        description: t("sf.ppDown"),
        variant: "destructive"
      });
      return;
    }

    const planId = plan?.id;
    if (!planId) {
      console.error('Invalid PayPal plan ID:', planId);
      toast({
        title: t("sf.cfgError"),
        description: t("sf.planNA"),
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
              title: t("sf.paid"),
              description: t("sf.paidNext"),
            });
            
            // Redirect to streamlined subscription complete page
            window.location.href = '/subscription-complete';
            
            if (onSuccess) {
              onSuccess(data.subscriptionID);
            }
          } catch (error) {
            console.error('Subscription processing failed:', error);
            toast({
              title: t("sf.subError"),
              description: t("sf.paidIssue") + data.subscriptionID,
              variant: "destructive"
            });
          }
        },
        onError: function(err: any) {
          console.error('PayPal Error Details:', err);
          
          let errorMessage = t("sf.subWrong");
          
          if (err.message) {
            if (err.message.includes('plan') || err.message.includes('PLAN')) {
              errorMessage = t("sf.badPlan");
            } else if (err.message.includes('payment')) {
              errorMessage = t("sf.payFail");
            } else if (err.message.includes('network')) {
              errorMessage = t("sf.netError");
            }
          }
          
          toast({
            title: t("sf.payError"),
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
            title: t("sf.cancelled"),
            description: t("sf.cancelledBody"),
          });
        }
      }).render('#subscription-paypal-button-container');
    } catch (error) {
      console.error('PayPal button initialization failed:', error);
      toast({
        title: t("sf.ppError"),
        description: t("sf.ppInit"),
        variant: "destructive"
      });
    }
  };

  const handleContinueToPayment = () => {
    if (!email || !fullName) {
      toast({
        title: t("sf.required"),
        description: t("sf.requiredBody"),
        variant: "destructive"
      });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: t("sf.badEmail"),
        description: t("sf.badEmailBody"),
        variant: "destructive"
      });
      return;
    }
    
    if (fullName.trim().length < 2) {
      toast({
        title: t("sf.badName"),
        description: t("sf.badNameBody"),
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
          {t("pr.soon")}
        </Button>
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            {t("sf.notYet")}
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
            <CardTitle className="text-2xl font-bold text-primary">{t("sf.title")}</CardTitle>
            
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                {t("sf.step1")}
              </p>
              <p className="text-sm font-medium text-purple-700 bg-purple-50 px-3 py-2 rounded-lg">
                {t("sf.step2")}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subscription-email">{t("sf.email")}</Label>
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
              <Label htmlFor="subscription-fullName">{t("sf.name")}</Label>
              <Input
                id="subscription-fullName"
                type="text"
                placeholder={t("sf.namePh")}
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
              {isLoading ? t("sf.loading") : t("sf.continue")}
            </Button>
            

          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("sf.payTitle")}</CardTitle>
            <div className="space-y-2">
              <p className="text-sm font-medium">{fullName}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
              <p className="text-sm text-muted-foreground">
                {plan.name} - ${plan.price}/{t("pr.month")}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPayPal(false)}
                className="text-xs"
              >
                {t("sf.edit")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div id="subscription-paypal-button-container" className="w-full min-h-[60px]">
              <div className="flex items-center justify-center h-12 text-muted-foreground">
                {t("sf.loadingPp")}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t("sf.securePp")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("sf.after")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// 7 Nov 2026: inside the EspaLuz Play app the subscription is sold through Google Play only (Play policy); the website
// keeps PayPal. One switch here covers every payment screen (Pricing, Index, Dashboard, chat upgrade).
const SubscriptionFlow = (props: SubscriptionFlowProps) =>
  insidePlayApp() ? <PlaySubscribe onSuccess={props.onSuccess} /> : <PayPalSubscriptionFlow {...props} />;

export default SubscriptionFlow;