import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Part } from "@/components/landing/Tree";
import { Check, Star, Heart, Brain, Users } from "lucide-react";

// 14 Nov 2026 (Elena: generic emojis look toyish): the purple check already marks each line, so the leading emoji is
// dropped when the line is drawn - English and Russian texts stay as they are in the locale files.
const noEmoji = (s: string) => s.replace(/^(?:[\p{Extended_Pictographic}\p{Regional_Indicator}\u{FE0F}\u{200D}]|\s)+/u, "");
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
  const { t } = useTranslation();
  // 1 Nov 2026 (Elena): the page tells the same truth as the bots - 14 days free, then ONE price, $11/month by PayPal
  // or PágueloFácil. The old Premium card promised things that do not exist (developer API, 24/7 support, 5+ users);
  // it now lists only features being built on what works. Family-plan features listed = what is built and live.
  const plans: PricingPlan[] = [
    {
      name: t("pr.freeName"),
      price: 0,
      duration: t("pr.days14"),
      description: t("pr.freeDesc"),
      features: [
        t("pr.ff1"),
        { label: t("pr.ffChat"), link: "/dashboard#chat" },
        t("pr.ff2"),
        t("pr.ff3"),
        t("pr.ff4"),
        t("pr.ff5"),
        t("pr.ff6")
      ],
      popular: false,
      paypal: false
    },
    {
      name: "EspaLuz Family",
      price: 11,
      duration: t("pr.month"),
      description: t("pr.famDesc"),
      features: [
        t("pr.fam1"),
        t("pr.fam2"),
        t("pr.fam3"),
        t("pr.fam4"),
        t("pr.fam5"),
        t("pr.fam6"),
        // 11 Nov 2026: no other way to pay is named inside the Play app (Google Payments policy).
        ...(insidePlayApp() ? [] : [t("pr.fam7")])
      ],
      popular: true,
      paypal: true,
      comingSoon: false,
      merchantId: "P8TXABNT28ZXG",
      // 7 Nov 2026: inside the Play app the payment is Google Play, so the card names it, not PayPal.
      bonus: insidePlayApp() ? t("pr.bonusPlay") : t("pr.bonusPaypal")
    },
    {
      // 1 Nov 2026 (Elena): Premium comes back as a roadmap the family can look forward to - only features we are
      // really building on what already works (the kids brain, family memory, parent reports, practical help,
      // conversation mode, hero videos). No dates, no price, no "AI miracles".
      name: "Premium",
      price: t("pr.soon"),
      description: t("pr.premDesc"),
      features: [
        t("pr.p1"),
        t("pr.p2"),
        t("pr.p3"),
        t("pr.p4"),
        t("pr.p5"),
        t("pr.p6"),
        t("pr.p7")
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
                        {t("pr.title1")}
            <span className="bg-gradient-primary bg-clip-text text-transparent"> {t("pr.title2")}</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("pr.lede")}
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
                    {t("pr.popular")}
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center pb-6">
                {plan.name === "Premium" && plan.comingSoon && (
                  <div className="mb-2">
                    <span className="inline-block bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold">{t("pr.soon")}</span>
                  </div>
                )}
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="mb-4">
                  {typeof plan.price === 'number' ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                      <span className="text-muted-foreground">
                        {plan.duration ? `/${plan.duration}` : `/${t("pr.month")}`}
                      </span>
                      {plan.paypal && (
                        <>
                          <div className="text-sm font-medium text-green-700 mt-2">{noEmoji(t("pr.secure", { by: insidePlayApp() ? "Google Play" : "PayPal" }))}</div>
                          {!insidePlayApp() && <div className="text-xs text-green-600">{t("pr.merchant")}: {plan.merchantId}</div>}
                          {plan.bonus && (
                            <div className="mt-2 px-3 py-1 bg-gradient-to-r from-green-100 to-blue-100 rounded-full">
                              <span className="text-sm font-bold text-green-700">{noEmoji(plan.bonus)}</span>
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
                      {noEmoji(plan.description)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{noEmoji(plan.description)}</span>
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
                      {t("pr.soon")}
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
                      {t("pr.soon")}
                    </Button>
                  </div>
                ) : (
                  <Link to="/auth?mode=signup" className="block mb-6">
                    <Button 
                      variant={plan.popular ? "hero" : "outline"} 
                      size="lg" 
                      className="w-full"
                    >
                      {t("pr.startTrial")}
                    </Button>
                  </Link>
                )}
                
                <details className="group/inc rounded-xl border border-border/70">
                  <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 px-4 py-2 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                    <span className="flex-1">{t("pr.included", { n: plan.features.length })}</span>
                    <span aria-hidden className="text-primary transition-transform duration-200 group-open/inc:rotate-180">▾</span>
                  </summary>
                  <div className="px-4 pb-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    typeof feature === 'string' ? (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{typeof feature === "string" ? noEmoji(feature) : feature}</span>
                      </li>
                     ) : (
                       <li key={featureIndex} className="flex items-start gap-3">
                         <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                         {feature.link === "/dashboard#chat" ? (
                           <Link to="/dashboard" state={{ scrollToChat: true }} className="w-full min-w-0" style={{ textDecoration: 'none' }}>
                             {/* 13 Nov 2026 (Elena's phone): the button's default nowrap pushed the label off both edges. */}
                             <Button variant="hero" size="lg" className="h-auto w-full whitespace-normal py-3 text-center leading-snug">
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