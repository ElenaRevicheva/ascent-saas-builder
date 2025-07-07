import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star } from "lucide-react";
import { Link } from "react-router-dom";
import PayPalButton from "./PayPalButton";

const Pricing = () => {
  const plans = [
    {
      name: "Free Trial",
      price: 0,
      duration: "1 week",
      description: "Try EspaLuz risk-free for one week",
      features: [
        "7-day free trial",
        "Basic AI conversations",
        "Telegram integration",
        "WhatsApp sandbox access",
        "Beginner lessons",
        "Community support"
      ],
      popular: false,
      paypal: false
    },
    {
      name: "Standard",
      price: 7.77,
      description: "Your personal AI Spanish tutor",
      features: [
        "Everything in Free Trial",
        "Unlimited conversations",
        "Advanced AI personality",
        "Voice & avatar videos",
        "Cultural immersion content",
        "Progress tracking",
        "Priority support"
      ],
      popular: true,
      paypal: true
    },
    {
      name: "Premium",
      price: "Coming Soon",
      description: "Advanced features for power users",
      features: [
        "Everything in Standard",
        "Family management (5+ users)",
        "Custom learning paths",
        "Advanced analytics",
        "Educational resources",
        "Dedicated support",
        "API access"
      ],
      popular: false,
      paypal: false,
      comingSoon: true
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-gradient-hero">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Choose Your
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Learning Plan</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start your Spanish learning journey today. Choose the perfect plan for you and your family. 
            Cancel anytime, no commitment required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative border-border hover:shadow-card transition-all duration-300 hover:-translate-y-1 ${
                plan.popular ? 'ring-2 ring-primary shadow-glow' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="mb-4">
                  {typeof plan.price === 'number' ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                      <span className="text-muted-foreground">
                        {plan.duration ? `/${plan.duration}` : '/month'}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-primary">{plan.price}</span>
                  )}
                </div>
                <CardDescription className="text-muted-foreground">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                {plan.paypal ? (
                  <div className="mb-6">
                    <PayPalButton 
                      planType="monthly"
                      onSuccess={(subscriptionId) => {
                        console.log('Subscription successful:', subscriptionId);
                        // Handle successful subscription
                      }}
                      onError={(error) => {
                        console.error('Subscription error:', error);
                      }}
                    />
                  </div>
                ) : plan.comingSoon ? (
                  <div className="block mb-6">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="w-full"
                      disabled
                    >
                      Coming Soon
                    </Button>
                  </div>
                ) : (
                  <Link to="/auth" className="block mb-6">
                    <Button 
                      variant={plan.popular ? "hero" : "outline"} 
                      size="lg" 
                      className="w-full"
                    >
                      Start Free Trial
                    </Button>
                  </Link>
                )}
                
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Start with a 1-week free trial. No credit card required.
          </p>
          <p className="text-sm text-muted-foreground">
            Need a custom solution? 
            <Link to="/contact" className="text-primary hover:underline ml-1">
              Contact our sales team
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;