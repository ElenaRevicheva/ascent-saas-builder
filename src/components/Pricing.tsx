import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star } from "lucide-react";
import { Link } from "react-router-dom";
import SubscriptionFlow from "./SubscriptionFlow";

interface PricingPlan {
  name: string;
  price: number | string;
  duration?: string;
  description: string;
  features: (string | { label: string; link: string })[];
  popular: boolean;
  paypal: boolean;
  comingSoon?: boolean;
  merchantId?: string;
  bonus?: string;
}

const Pricing = () => {
  const plans: PricingPlan[] = [
    {
      name: "Free Trial",
      price: 0,
      duration: "20 messages",
      description: "Try EspaLuz risk-free with 20 free messages",
      features: [
        "20 free messages to EspaLuz",
        { label: "¡Conversemos! Chat with EspaLuz right here!", link: "/dashboard#chat" },
        "✨ Chat in any language - English, Spanish, or Russian",
        "🌍 Instant translation magic - every word teaches you",
        "🧠 Smart AI that gets you - context-aware replies",
        "🗣️ Natural pronunciation - AI voices in Spanish & English",
        "🎬 Avatar video generation with synchronized audio",
        "🎤 Voice recording and transcription"
      ],
      popular: false,
      paypal: false
    },
    {
      name: "Standard",
      price: 7.77,
      duration: "month",
      description: "🎯 Full EspaLuz Dashboard Experience - Unlimited Learning!",
      features: [
        "✨ Everything in Free Trial UNLIMITED",
        "🚀 Unlimited bilingual chat conversations",
        "🎧 Unlimited voice generation & audio downloads",
        "🎬 Unlimited avatar video generation",
        "🎤 Unlimited voice recording & transcription",
        "🧠 AI that adapts to YOU - personalized learning",
        "📈 Complete progress tracking & analytics",
        "👨‍👩‍👧‍👦 Family member profiles & management"
      ],
      popular: true,
      paypal: true,
      comingSoon: false,
      merchantId: "P8TXABNT28ZXG",
      bonus: "🎁 BONUS: 1 week free trial"
    },
    {
      name: "Premium",
      price: "Coming Soon",
      description: "",
      features: [
        "✨ Everything in Standard SUPERCHARGED:",
        "👨‍👩‍👧‍👦 Family squad (5+ users) - Spanish for the whole crew!",
        "🎯 AI-crafted learning paths - built just for YOU",
        "📊 Pro analytics dashboard - watch your Spanish explode",
        "📚 Exclusive content vault - premium resources only",
        "💎 White-glove support - we've got your back 24/7",
        "⚙️ Developer API access - Spanish learning, your way",
        { label: "🔥 CAN'T WAIT FOR STANDARD/PREMIUM??", labelClass: "text-red-600 font-bold", link: "https://t.me/EspaLuzFamily_bot", linkText: "Try Telegram AI Tutor NOW!", linkClass: "text-blue-600 font-bold hover:underline" }
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
                {plan.name === "Premium" && plan.comingSoon && (
                  <div className="mb-2">
                    <span className="inline-block bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold">Coming Soon</span>
                  </div>
                )}
                <CardTitle className="text-2xl mb-2">{plan.name === "Premium" ? "🚀 Premium" : plan.name}</CardTitle>
                <div className="mb-4">
                  {typeof plan.price === 'number' ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                      <span className="text-muted-foreground">
                        {plan.duration ? `/${plan.duration}` : '/month'}
                      </span>
                      {plan.paypal && (
                        <>
                          <div className="text-sm font-medium text-green-700 mt-2">🛡️ Secure payment powered by PayPal</div>
                          <div className="text-xs text-green-600">Merchant ID: {plan.merchantId}</div>
                          {plan.bonus && (
                            <div className="mt-2 px-3 py-1 bg-gradient-to-r from-green-100 to-blue-100 rounded-full">
                              <span className="text-sm font-bold text-green-700">{plan.bonus}</span>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-primary">{plan.price}</span>
                  )}
                </div>
                <CardDescription>
                  {plan.name === "Standard" ? (
                    <span className="font-bold bg-gradient-to-r from-green-400 via-emerald-500 to-lime-400 bg-clip-text text-transparent text-lg drop-shadow-sm">
                      {plan.description}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{plan.description}</span>
                  )}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                {plan.paypal && !plan.comingSoon ? (
                  <div className="mb-6">
                    <SubscriptionFlow 
                      planType="standard"
                      onSuccess={(subscriptionId) => {
                        console.log('PayPal subscription successful:', subscriptionId);
                        // SubscriptionFlow handles the redirect to auth after PayPal payment
                      }}
                      onError={(error) => {
                        console.error('PayPal subscription error:', error);
                      }}
                    />
                  </div>
                ) : plan.comingSoon && plan.paypal ? (
                  <div className="mb-6">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="w-full"
                      disabled
                    >
                      Coming Soon
                    </Button>
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
                  <Link to="/dashboard" state={{ scrollToChat: true }} className="block mb-6">
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
                    typeof feature === 'string' ? (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                     ) : (
                       <li key={featureIndex} className="flex items-start gap-3">
                         <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                         {feature.label === "¡Conversemos! Chat with EspaLuz right here!" ? (
                           <Link to="/dashboard" state={{ scrollToChat: true }} className="w-full" style={{ textDecoration: 'none' }}>
                             <Button variant="hero" size="lg" className="w-full">
                               {feature.label}
                             </Button>
                           </Link>
                         ) : (
                           <a href={feature.link} className={feature.linkClass || "text-primary font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded transition-colors"} target="_blank" rel="noopener noreferrer">
                             {feature.linkText || feature.label}
                           </a>
                         )}
                      </li>
                    )
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="mt-8 flex flex-col items-center gap-4">
            <h4 className="text-xl font-bold bg-gradient-to-r from-pink-500 via-yellow-400 to-orange-400 bg-clip-text text-transparent">Invest & Partner</h4>
            <p className="text-md text-muted-foreground">Join us in building the future of emotional AI</p>
            <a
              href="https://aideazz.xyz/pitch.html"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-block px-8 py-3 text-lg font-bold rounded bg-gradient-to-r from-pink-500 via-yellow-400 to-orange-400 text-white text-center shadow-lg hover:opacity-90 transition z-[9999]"
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 9999 }}
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;