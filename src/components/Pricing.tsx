import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Part } from "@/components/landing/Tree";
import { Check, Star, Heart, Brain, Users } from "lucide-react";
import { Link } from "react-router-dom";
import SubscriptionFlow from "./SubscriptionFlow";
import { insidePlayApp } from "@/lib/playBilling";

interface PricingPlan {
  name: string;
  price: number | string;
  duration?: string;
  description: string;
  features: (string | { label: string; link: string; labelClass?: string; linkClass?: string; linkText?: string })[];
  popular: boolean;
  paypal: boolean;
  comingSoon?: boolean;
  merchantId?: string;
  bonus?: string;
}

const Pricing = () => {
  // 1 Nov 2026 (Elena): the page tells the same truth as the bots - 14 days free, then ONE price, $11/month by PayPal
  // or PágueloFácil. The old Premium card promised things that do not exist (developer API, 24/7 support, 5+ users);
  // it now lists only features being built on what works. Family-plan features listed = what is built and live.
  const plans: PricingPlan[] = [
    {
      name: "Free Trial",
      price: 0,
      duration: "14 days",
      description: "14 days free on WhatsApp, Telegram and the web — no card needed",
      features: [
        "🆓 14 days free on WhatsApp, Telegram and the web",
        { label: "¡Conversemos! Chat with EspaLuz right here!", link: "/dashboard#chat" },
        "💬 Try 20 messages right here, no sign-up",
        "✨ Chat in any language - English, Spanish, or Russian",
        "🌍 Instant translation magic - every word teaches you",
        "🗣️ Natural pronunciation - AI voices in Spanish & English",
        "🎤 Voice recording and transcription"
      ],
      popular: false,
      paypal: false
    },
    {
      name: "EspaLuz Family",
      price: 11,
      duration: "month",
      description: "🎯 The whole family learns Spanish & English - on WhatsApp, Telegram and the web",
      features: [
        "🦥🐒 Pere & Titi's kids classroom (ages 6-7) - their own voices, games, stars & stickers",
        "📒 A parent report after every kids lesson + a 2-minute daily game to do together",
        "📱 One family on WhatsApp, Telegram and the web - every lesson remembered everywhere",
        "🚀 Unlimited bilingual chat, voice notes and translation",
        "📷 Photos: show a toy or a menu, EspaLuz talks about it",
        "👨‍👩‍👧‍👦 Family member profiles",
        "🇵🇦 Prefer to pay month by month? $11 for 30 days with PágueloFácil - type pagar in EspaLuz WhatsApp or /pagar in Telegram"
      ],
      popular: true,
      paypal: true,
      comingSoon: false,
      merchantId: "P8TXABNT28ZXG",
      // 7 Nov 2026: inside the Play app the payment is Google Play, so the card names it, not PayPal.
      bonus: insidePlayApp() ? "🎁 Your first charge comes 2 weeks after you subscribe" : "🎁 First PayPal charge 2 weeks after you subscribe"
    },
    {
      // 1 Nov 2026 (Elena): Premium comes back as a roadmap the family can look forward to - only features we are
      // really building on what already works (the kids brain, family memory, parent reports, practical help,
      // conversation mode, hero videos). No dates, no price, no "AI miracles".
      name: "Premium",
      price: "Coming Soon",
      description: "In development - built step by step on what EspaLuz already does. Real features, no promises we can't keep.",
      features: [
        "🗣️ Talk together: you and your child in one conversation - Pere & Titi know who is speaking and help you both",
        "🧠 Deeper family memory - each child's words, friends, pets and missions remembered for months, on every channel",
        "📄 A monthly progress report card (PDF) - sentences learned, missions done, next month's focus",
        "👧👦 Brothers and sisters - lessons for ages 3-5, 6-7 and 8-10 in one family",
        "👵 Grandparents in the family plan - Spanish and English, with Russian help",
        "🇵🇦 Panama life helper - school notes, doctor visits, bank and immigration wording, photo of a document → explained",
        "🎬 New Pere & Titi adventures in real Panama places"
      ],
      popular: false,
      paypal: false,
      comingSoon: true
    }
  ];

  return (
    <section id="pricing" className="py-24">
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
                          <div className="text-sm font-medium text-green-700 mt-2">🛡️ Secure payment powered by {insidePlayApp() ? "Google Play" : "PayPal"}</div>
                          {!insidePlayApp() && <div className="text-xs text-green-600">Merchant ID: {plan.merchantId}</div>}
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
                  <Link to="/auth?mode=signup" className="block mb-6">
                    <Button 
                      variant={plan.popular ? "hero" : "outline"} 
                      size="lg" 
                      className="w-full"
                    >
                      Start Free Trial
                    </Button>
                  </Link>
                )}
                
                <details className="group/inc rounded-xl border border-border/70">
                  <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 px-4 py-2 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                    <span className="flex-1">What's included ({plan.features.length})</span>
                    <span aria-hidden className="text-primary transition-transform duration-200 group-open/inc:rotate-180">▾</span>
                  </summary>
                  <div className="px-4 pb-4">
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
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Pricing;