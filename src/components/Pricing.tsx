import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, Heart, Brain, Users } from "lucide-react";
import { Link } from "react-router-dom";
import SubscriptionFlow from "./SubscriptionFlow";

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
  // or PágueloFácil. The "Premium - Coming Soon" card promised things that do not exist (developer API, 24/7 support,
  // 5+ users) and made a parent wait instead of pay; removed. Features listed = what is built and live.
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
      bonus: "🎁 First PayPal charge 2 weeks after you subscribe"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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

        {/* Philosophy Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Our Philosophy</h2>
            <h3 className="text-2xl font-semibold text-primary mb-6">Vibe Coding</h3>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We build AI that understands not just what you say, but how you feel, that remembers not just what you prompt, but Who You are Becoming through your Lifetime Journey challenges, the way you grow and transform, on-the-go.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="text-center border-border shadow-card">
              <CardHeader>
                <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <CardTitle>Emotional Intelligence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  AI that recognizes and responds to human emotions with genuine care and understanding.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-border shadow-card">
              <CardHeader>
                <Brain className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <CardTitle>Adaptive Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Systems that evolve with your needs, learning your preferences and growing alongside you.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-border shadow-card">
              <CardHeader>
                <Users className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardTitle>Human-Centered Design</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Technology built around human needs, not the other way around. Simple, intuitive, and empowering.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              🚀 Vibe Coding → Emotional Intelligence → AI Consciousness?
            </h3>
            <p className="text-lg md:text-xl text-muted-foreground max-w-5xl mx-auto leading-relaxed">
              Vibe coding is not just a smarter way to build software, it is the missing layer that leads us toward AI consciousness. We're building the foundation for conscious AI through emotionally intelligent systems that understand, remember, and evolve with human experience.
            </p>
          </div>
        </div>

        {/* Platform Overview */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">The Birthplace of EspaLuz</h2>
            <h3 className="text-3xl md:text-4xl font-semibold text-primary mb-8">What is AIdeazz?</h3>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto mb-8 leading-relaxed">
              EspaLuz was born from the <a href="https://www.aideazz.xyz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">AIdeazz.xyz</a> ecosystem — a visionary platform being developed for crafting and evolving emotionally intelligent AI Personal Assistants (AIPAs).
            </p>
            
            {/* AIPA Demo Video */}
            <div className="mb-8">
              <div className="max-w-4xl mx-auto">
                <h4 className="text-xl font-semibold text-foreground mb-4">See AIPA in Action</h4>
                <div className="relative rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-purple-100 to-orange-100 p-1">
                  <video 
                    controls 
                    className="w-full h-auto rounded-md bg-black"
                    poster=""
                  >
                    <source src="https://euyidvolwqmzijkfrplh.supabase.co/storage/v1/object/public/generated-videos/demo2.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-purple-800 font-medium">
                🚧 <strong>Currently in Development</strong> — The full AIdeazz ecosystem is being built to revolutionize how we interact with AI. Get ready for a new era of emotionally intelligent assistants! EspaLuz is our first graduate, showcasing the incredible potential of truly empathetic AI.
              </p>
            </div>
          </div>

          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
              Built Not to Replace People — But to Help Humans Thrive
            </h3>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              AIdeazz empowers human potential through AI that truly understands, adapts, and grows with you. This is AI for human flourishing.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-foreground mb-4">Join the Revolution</h2>
            <div className="grid md:grid-cols-1 gap-6 max-w-2xl mx-auto">
              <Card className="border-border shadow-card">
                <CardHeader>
                  <CardTitle>Experience <span className="text-3xl font-extrabold bg-gradient-to-r from-pink-500 via-yellow-400 to-orange-400 bg-clip-text text-transparent">AIevolution</span></CardTitle>
                  <CardDescription>Try our live AIPA and see emotional AI in action</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/auth">
                    <Button className="w-full" variant="hero">
                      Chat Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

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