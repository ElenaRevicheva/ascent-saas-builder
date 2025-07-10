import { useState } from 'react';
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Pricing from "@/components/Pricing";
import { CookieConsent } from "@/components/CookieConsent";
import { ChatWithEspaluz } from "@/components/dashboard/ChatWithEspaluz";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Heart, Sparkles, Globe, MessageSquare, Bot, Rocket, Shield, Users, ArrowRight, Play, Star, TrendingUp, Crown, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import brandAvatar2 from '@/assets/brand-avatar-2.jpg';
import espaluzQr from '@/assets/espaluz-qr.jpg';
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
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleStartDemo = () => {
    setShowDemoModal(true);
  };

  const handleUpgradeFromDemo = () => {
    setShowDemoModal(false);
    // Scroll to pricing section
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-12 pb-6 text-center bg-gradient-magical rounded-2xl shadow-vibrant">
        <img src={brandAvatar2} alt="Brand" className="mx-auto w-32 h-32 rounded-full border-4 border-primary shadow-glow object-cover bg-white mb-4" />
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-relaxed bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent drop-shadow px-4 py-2">
          Meet EspaLuz — Your Family’s First Emotionally Intelligent Language Coach
        </h1>
        <p className="text-base text-foreground mb-4 max-w-3xl mx-auto leading-relaxed font-medium">
          Not just another chatbot. Not just grammar drills.<br/>
          <span className="text-primary font-semibold">EspaLuz</span> is your on-the-go AI tutor that feels you, adapts to you, and guides your family through real-life Spanish or English — with empathy.
        </p>
        <ul className="text-left text-sm max-w-2xl mx-auto mb-4 space-y-1">
          <li><span className="text-primary text-xl">🧠</span> <span className="font-bold text-primary">Truly intelligent</span> <span className="text-muted-foreground">— understands your tone, mood, and emotional state</span></li>
          <li><span className="text-secondary text-xl">💬</span> <span className="font-bold text-secondary">Human-like support</span> <span className="text-muted-foreground">— replies with warmth, patience, and encouragement</span></li>
          <li><span className="text-accent text-xl">📱</span> <span className="font-bold text-accent">Always with you</span> <span className="text-muted-foreground">— chat via Telegram or Web, anytime, anywhere</span></li>
          <li><span className="text-destructive text-xl">🌍</span> <span className="font-bold text-destructive">Made for real lives</span> <span className="text-muted-foreground">— perfect for:</span></li>
          <ul className="ml-6 list-disc text-xs">
            <li className="text-primary">English speakers traveling or relocating to LATAM</li>
            <li className="text-secondary">Spanish speakers mastering English for work, travel, or study</li>
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
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6 mb-4">
          <Button 
            onClick={handleStartDemo}
            size="lg" 
            className="text-base px-6 bg-gradient-primary hover:shadow-glow text-white rounded-full shadow-lg hover:scale-105 transition-all duration-300"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            🎯 Try Demo FREE!
          </Button>
          <Link to="/auth">
            <Button size="lg" variant="outline" className="text-base px-6 rounded-full border-2 border-primary text-primary hover:bg-gradient-primary hover:text-white transition-all duration-300">
              <Crown className="mr-2 h-4 w-4" />
              🚀 Start Full Version
            </Button>
          </Link>
        </div>
      </section>

      {/* Demo Benefits Section */}
      <section className="container mx-auto px-4 py-12 bg-gradient-magical rounded-2xl shadow-vibrant mb-6">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-gradient-primary text-white">No Signup Required</Badge>
          <h2 className="text-3xl font-bold mb-3 text-primary">
            Try EspaLuz Risk-Free!
          </h2>
          <p className="text-base text-foreground max-w-3xl mx-auto mb-6">
            Experience our emotionally intelligent bilingual AI coach with <strong>no signup required</strong>. 
            Chat up to 20 messages to see how EspaLuz helps your family learn naturally.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-purple-700 mb-6">Demo Experience</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
                <span className="text-lg">No signup required - start instantly</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
                <span className="text-lg">Experience bilingual conversations in Spanish/English</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
                <span className="text-lg">See how EspaLuz adapts to your family's needs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
                <span className="text-lg">Up to 20 demo messages to explore</span>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
              <div className="flex items-center gap-3 mb-3">
                <Crown className="h-6 w-6 text-orange-600" />
                <span className="text-lg font-bold text-orange-700">
                  Subscribe to Keep Everything Forever!
                </span>
              </div>
              <ul className="text-sm space-y-2 text-gray-700">
                <li>🔄 <strong>All your demo conversations saved permanently</strong></li>
                <li>🎯 Unlimited conversations with no message limits</li>
                <li>🎤 Voice messages and AI voice generation</li>
                <li>🎬 Personalized avatar videos for kids</li>
                <li>👨‍👩‍👧‍👦 Family member profiles and progress tracking</li>
                <li>📊 Learning analytics and personalized lessons</li>
              </ul>
            </div>
          </div>
          
          <Card className="bg-white border-2 border-purple-200 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <Badge className="mb-3 bg-purple-500 text-white">
                <Star className="h-3 w-3 mr-1" />
                Live Preview
              </Badge>
              <CardTitle className="text-2xl text-purple-700">What You'll Experience</CardTitle>
              <CardDescription className="text-gray-600">
                See EspaLuz in action - emotionally intelligent and bilingual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  <span className="text-sm">Natural bilingual conversations</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Heart className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">Emotionally intelligent responses</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Family-friendly coaching style</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <Globe className="h-5 w-5 text-orange-600" />
                  <span className="text-sm">Spanish/English cultural adaptation</span>
                </div>
              </div>
              
              <Button 
                onClick={handleStartDemo}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold py-3"
              >
                <Zap className="mr-2 h-4 w-4" />
                Start Demo Now - It's FREE!
              </Button>
              
              <p className="text-xs text-center text-gray-500 mt-2">
                No email required • Instant access • 20 messages to explore
              </p>
            </CardContent>
          </Card>
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

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">Living Proof of Concept</Badge>
          <h2 className="text-4xl font-bold text-foreground mb-4">
            EspaLuz - AI Family Tutor
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your bilingual AI family tutor — emotionally intelligent, culturally aware, and ready to help expat families thrive in Spanish-speaking countries, Spanish speakers upgrading their English, and travelers exploring new cultures.
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

              <a href="https://t.me/EspaLuzFamily_bot" target="_blank" rel="noopener noreferrer" className="w-full">
                <Button className="w-full" variant="hero">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Open Telegram Chat
                </Button>
              </a>
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
          <h2 className="text-4xl font-bold text-foreground mb-4">The Birthplace of EspaLuz</h2>
          <h3 className="text-2xl font-semibold text-primary mb-6">What is AIdeazz?</h3>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-4">
            EspaLuz was born from the <a href="https://www.aideazz.xyz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">AIdeazz.xyz</a> ecosystem — a visionary platform being developed for crafting and evolving emotionally intelligent AI Personal Assistants (AIPAs).
          </p>
          <div className="bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-purple-800 font-medium">
              🚧 <strong>Currently in Development</strong> — The full AIdeazz ecosystem is being built to revolutionize how we interact with AI. Get ready for a new era of emotionally intelligent assistants! EspaLuz is our first graduate, showcasing the incredible potential of truly empathetic AI.
            </p>
          </div>
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
      <div id="pricing">
        <Pricing />
      </div>

      {/* About the Creator Section */}
      <section id="about" className="container mx-auto px-4 py-8 mt-6 text-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-3xl shadow-lg">
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
      
      {/* Demo Modal */}
      <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center">
              <MessageSquare className="h-5 w-5 text-orange-500" />
              Try EspaLuz Free Demo
              <Badge variant="outline" className="ml-2">No Signup Required</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <ChatWithEspaluz 
              demoMode={true} 
              onUpgradeClick={handleUpgradeFromDemo}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
