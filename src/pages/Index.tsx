import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Pricing from "@/components/Pricing";
import { CookieConsent } from "@/components/CookieConsent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Heart, Sparkles, Globe, MessageSquare, Bot, Rocket, Shield, Users, ArrowRight, Play, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import brandAvatar2 from '@/assets/brand-avatar-2.jpg';
import espaluzQr from '@/assets/espaluz-qr.jpg';
import { useState } from 'react';
import creatorQr from '@/assets/creator-qr.jpg';

function FeedbackForm() {
  return (
    <form
      action="https://formspree.io/f/mnqewqzv" // Replace with your Formspree endpoint if needed
      method="POST"
      className="max-w-lg mx-auto bg-white rounded-xl shadow p-6 mt-12 flex flex-col gap-4"
    >
      <h3 className="text-2xl font-bold text-purple-700 mb-2">We value your feedback!</h3>
      <input
        type="email"
        name="email"
        placeholder="Your email (optional)"
        className="border rounded px-3 py-2"
      />
      <textarea
        name="message"
        placeholder="Your feedback..."
        className="border rounded px-3 py-2 min-h-[100px]"
        required
      />
      <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2 font-semibold">Send Feedback</button>
      <input type="hidden" name="_next" value="/thank-you.html" />
    </form>
  );
}

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-8 text-center bg-gradient-to-br from-orange-100 via-pink-100 to-purple-100 rounded-3xl shadow-xl">
        <img src={brandAvatar2} alt="Brand" className="mx-auto w-40 h-40 rounded-full border-4 border-orange-300 shadow-xl object-cover bg-white mb-6" />
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent drop-shadow">
          Meet EspaLuz — Your Family’s First Emotionally Intelligent Language Coach
        </h1>
        <p className="text-lg text-pink-700 mb-6 max-w-3xl mx-auto leading-relaxed font-medium">
          Not just another chatbot. Not just grammar drills.<br/>
          <span className="text-orange-700 font-semibold">EspaLuz</span> is your on-the-go AI tutor that feels you, adapts to you, and guides your family through real-life Spanish or English — with empathy.
        </p>
        <ul className="text-left text-lg max-w-2xl mx-auto mb-6 space-y-2">
          <li><span className="text-orange-500 text-2xl">🧠</span> <span className="font-bold text-orange-700">Truly intelligent</span> <span className="text-gray-700">— understands your tone, mood, and emotional state</span></li>
          <li><span className="text-pink-500 text-2xl">💬</span> <span className="font-bold text-pink-700">Human-like support</span> <span className="text-gray-700">— replies with warmth, patience, and encouragement</span></li>
          <li><span className="text-purple-500 text-2xl">📱</span> <span className="font-bold text-purple-700">Always with you</span> <span className="text-gray-700">— chat via Telegram or Web, anytime, anywhere</span></li>
          <li><span className="text-rose-500 text-2xl">🌍</span> <span className="font-bold text-rose-700">Made for real lives</span> <span className="text-gray-700">— perfect for:</span></li>
          <ul className="ml-6 list-disc">
            <li className="text-orange-700">English speakers traveling or relocating to LATAM</li>
            <li className="text-purple-700">Spanish speakers mastering English for work, travel, or study</li>
          </ul>
        </ul>
        <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">
          ✨ Whether you're moving, vacationing, or upskilling for a new career, EspaLuz helps you speak naturally — not like a textbook, but like a local.
        </p>
        <p className="text-lg text-orange-700 font-semibold mb-4 max-w-2xl mx-auto">
          ⚡ Start speaking confidently in just a couple of weeks — without stress or pressure.
        </p>
        <p className="text-lg text-purple-700 font-semibold max-w-2xl mx-auto">
          💡 Because language is more than words — it’s emotional.<br/>
          And EspaLuz is the first AI tutor that truly gets that.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 mb-8">
          <Link to="/auth">
            <Button size="xl" variant="hero" className="text-lg px-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg">
              🚀 Start Free
            </Button>
          </Link>
        </div>
      </section>
      {/* QR Code Viral Loop Section */}
      <section className="container mx-auto px-4 py-8 text-center">
        <div className="flex flex-col items-center">
          <img src={espaluzQr} alt="EspaLuz QR" className="w-48 h-48 object-contain rounded-2xl shadow-xl border-4 border-pink-300 mb-4" />
          <h3 className="text-2xl font-bold text-orange-600 mb-2">Invite your family!</h3>
          <p className="text-lg text-purple-700 mb-2">Scan to join our Telegram and start learning together.</p>
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
              </div>

              <Button className="w-full" variant="hero">
                <MessageSquare className="mr-2 h-4 w-4" />
                Open Telegram Chat
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

      {/* Pricing Section */}
      <Pricing />

      {/* About the Creator Section */}
      <section className="container mx-auto px-4 py-12 mt-16 text-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-3xl shadow-lg">
        <h2 className="text-3xl font-extrabold text-purple-700 mb-4">About the Creator</h2>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-6">
          🧠 <span className="font-bold text-purple-700">Solo Founder and AI Entrepreneur: Elena Revicheva</span><br/>
          Hi, I’m Elena — founder of AIdeazz, where I craft emotionally intelligent AI agents to support real human lives.<br/><br/>
          <span className="font-bold text-orange-700">EspaLuz is our first graduate. My journey to AIdeazz was deeply personal:</span><br/><br/>
          🇷🇺 Former top IT project manager & Chief Legal Officer in Russia’s E-Government<br/>
          ✈️ Relocated to Panama in 2022 as a single mother <br/>
          💡 AI helped me rebuild myself from scratch — in a new country, a new language, and a new profession. Now I’m sharing that path with others, through human-centered AI.<br/><br/>
          📇 Scan my card below to connect, collaborate, or join the Aideazz journey. This is just the beginning.
        </p>
        <img src={creatorQr} alt="Creator Business Card QR" className="mx-auto w-48 h-48 object-contain rounded-2xl shadow-xl border-4 border-purple-300 mb-4" />
        <p className="text-md text-purple-600 font-semibold">Let’s build the future of learning together!</p>
      </section>

      <Footer />
      <CookieConsent />
      <FeedbackForm />
    </div>
  );
};

export default Index;
