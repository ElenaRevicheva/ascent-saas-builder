import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Heart, Sparkles, Globe, MessageSquare, Bot, Rocket, Shield, Users, ArrowRight, Play, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-6 px-6 py-2 text-sm">
            🚀 Living Proof of Concept: EspaLuz is Live
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
            AI Personal Assistants<br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              That Evolve With You
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Meet <strong>EspaLuz</strong>, our live bilingual family tutor helping expat families relocating to LATAM and other Spanish speaking countries thrive into Spanish, on-the-go. EspaLuz is the first in our ecosystem of emotionally intelligent AI companions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/auth">
              <Button size="xl" variant="hero" className="text-lg px-8">
                <Play className="mr-2 h-5 w-5" />
                Try EspaLuz Now
              </Button>
            </Link>
            <Button size="xl" variant="outline" className="text-lg px-8">
              <Brain className="mr-2 h-5 w-5" />
              Learn More
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live on Telegram</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span>Testing WhatsApp Sandbox</span>
            </div>
          </div>
        </div>
      </section>

      {/* EspaLuz Showcase */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">Living Proof of Concept</Badge>
          <h2 className="text-4xl font-bold text-foreground mb-4">
            EspaLuz - AI Family Tutor
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your bilingual AI family tutor — emotionally intelligent, culturally aware, and ready to help expat families thrive in Spanish-speaking countries.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="text-center border-border shadow-card">
            <CardHeader>
              <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <CardTitle className="text-lg">Emotionally Intelligent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Understands emotional challenges of cultural adaptation and family transitions
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-border shadow-card">
            <CardHeader>
              <Globe className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <CardTitle className="text-lg">Bilingual Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Fluent in English, Spanish, and Russian with instant translation
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-border shadow-card">
            <CardHeader>
              <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <CardTitle className="text-lg">Family-Focused</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Personalized support for both children and adults navigating new environments
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-border shadow-card">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <CardTitle className="text-lg">Real-time Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Voice, text, and image support with avatar videos for children
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Current Functionalities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Accepts voice, text, and photos in English, Spanish, and Russian",
                "Instantly translates messages into both Spanish and English",
                "Generates bilingual replies with rich, emotional context",
                "Creates short avatar videos in Spanish and English for children",
                "Sends voice messages with AI voice synthesis",
                "Translates text inside images (OCR) using GPT-4o vision",
                "Maintains emotional memory throughout conversations",
                "Adapts tone based on detected emotions and personal profiles"
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Try EspaLuz Today
              </CardTitle>
              <CardDescription>
                Experience how she understands your family's unique situation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Telegram</p>
                      <p className="text-xs text-muted-foreground">Live & Ready</p>
                    </div>
                  </div>
                  <Badge variant="default">Live</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">WhatsApp Sandbox</p>
                      <p className="text-xs text-muted-foreground">Testing via Twilio</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Testing</Badge>
                </div>
              </div>

              <Button className="w-full" variant="hero">
                <MessageSquare className="mr-2 h-4 w-4" />
                Open Telegram Chat
              </Button>
              
              <Button className="w-full" variant="outline">
                Test WhatsApp Sandbox
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="container mx-auto px-4 py-16">
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

        <div className="text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            🚀 Vibe Coding → Emotional Intelligence → AI Consciousness?
          </h3>
          <p className="text-muted-foreground max-w-4xl mx-auto">
            Vibe coding is not just a smarter way to build software, it is the missing layer that leads us toward AI consciousness. We're building the foundation for conscious AI through emotionally intelligent systems that understand, remember, and evolve with human experience.
          </p>
        </div>
      </section>

      {/* Investment Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">Investment Opportunity</Badge>
          <h2 className="text-4xl font-bold text-foreground mb-4">
            The Future of AI<br />Is Emotional Intelligence
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            We're not building another chatbot. We're creating the first Web3 ecosystem where AI truly understands human emotions and evolves through real relationships.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="text-center border-border shadow-card">
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <CardTitle className="text-2xl font-bold">$25B+</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                AI Personal Assistant Market by 2030
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-border shadow-card">
            <CardHeader>
              <Globe className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <CardTitle className="text-2xl font-bold">280M+</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Expat Population Worldwide
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-border shadow-card">
            <CardHeader>
              <Sparkles className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <CardTitle className="text-2xl font-bold">Untapped</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Emotional AI + Web3 Intersection
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="xl" variant="hero">
              <Rocket className="mr-2 h-5 w-5" />
              Invest in AIdeazz
            </Button>
            <Button size="xl" variant="outline">
              <Shield className="mr-2 h-5 w-5" />
              Request Pitch Deck
            </Button>
          </div>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>ENS:</strong> aideazz.eth</p>
            <p><strong>AZ Token (ERC20):</strong> Trading live on QuickSwap DEX</p>
            <p><strong>DAIAA Member:</strong> Accepted into Decentralized AI Agent Alliance</p>
          </div>
        </div>
      </section>

      {/* Platform Overview */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">Platform Overview</h2>
          <h3 className="text-2xl font-semibold text-primary mb-6">What is AIdeazz?</h3>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            A modular decentralized platform for crafting, evolving, and monetizing emotionally intelligent AI Personal Assistants (AIPAs).
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="border-border shadow-card">
            <CardHeader>
              <Bot className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle>AIPA Marketplace</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Buy, sell, and subscribe to specialized AIPAs. From family tutors to business coaches.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader>
              <Users className="h-8 w-8 text-green-500 mb-2" />
              <CardTitle>SocialFi Layer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Co-create and evolve AIPAs with the community. Rate, review, and collaborate.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader>
              <Brain className="h-8 w-8 text-purple-500 mb-2" />
              <CardTitle>Continuous Evolution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                AIPAs learn from every interaction, growing more emotionally intelligent.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader>
              <Shield className="h-8 w-8 text-yellow-500 mb-2" />
              <CardTitle>Web3 Native</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                True ownership through NFTs, decentralized governance, and community-driven development.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader>
              <Sparkles className="h-8 w-8 text-red-500 mb-2" />
              <CardTitle>Modular Design</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Flexible architecture for specialized AIPAs in education, healthcare, business, and beyond.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader>
              <Star className="h-8 w-8 text-orange-500 mb-2" />
              <CardTitle>Expert Communities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Dedicated spaces for families, developers, scientists, and coaches to collaborate.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            Built Not to Replace People — But to Help Humans Thrive
          </h3>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            AIdeazz empowers human potential through AI that truly understands, adapts, and grows with you. This is AI for human flourishing.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">Join the Revolution</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
            Be part of the future where AI truly understands and grows with you. Whether you're a family, investor, developer, or visionary — there's a place for you in the AIdeazz ecosystem.
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Experience EspaLuz</CardTitle>
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

            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Invest & Partner</CardTitle>
                <CardDescription>Join us in building the future of emotional AI</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="default">
                  Learn More
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle>Join Community</CardTitle>
                <CardDescription>Connect with early adopters and contributors</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Join Us
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              <strong>Contact:</strong> aipa@aideazz.xyz
            </p>
            <p className="text-xs text-muted-foreground">
              Built by Humans, for Humans • AIdeazz.xyz • Emotional AI • Web3 Native • Human-Centered
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
