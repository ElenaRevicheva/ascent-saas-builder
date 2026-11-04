import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Pricing from "@/components/Pricing";
import { CookieConsent } from "@/components/CookieConsent";
import { ChatWithEspaluz } from "@/components/dashboard/ChatWithEspaluz";
import SubscriptionFlow from "@/components/SubscriptionFlow";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Heart, Sparkles, Globe, MessageSquare, Bot, Rocket, Shield, Users, ArrowRight, Play, Star, TrendingUp, Crown, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { feedbackSchema } from "@/lib/validations";

import brandAvatar2 from '@/assets/brand-avatar-2.jpg';
import espaluzQr from '@/assets/espaluz-qr.jpg';
import portfolioQr from '@/assets/portfolio-qr.png';
import whatsappQr from '@/assets/whatsapp-qr-code.jpg';

function FeedbackForm() {
  const [formData, setFormData] = useState({
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Validate form data
      const validatedData = feedbackSchema.parse(formData);

      const { error } = await supabase
        .from('feedback')
        .insert([
          {
            email: validatedData.email || null,
            message: validatedData.message
          }
        ]);

      if (error) throw error;

      setSubmitStatus('success');
      // Reset form
      setFormData({ email: '', message: '' });
    } catch (error: any) {
      if (error.errors) {
        // Zod validation errors
        setSubmitStatus('error');
      } else {
        setSubmitStatus('error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto bg-white rounded-xl shadow p-6 mt-12 flex flex-col gap-4"
    >
      <h3 className="text-2xl font-bold text-purple-700 mb-2">We value your feedback!</h3>
      
      {submitStatus === 'success' && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          Thank you! Your feedback has been submitted successfully!
        </div>
      )}
      
      {submitStatus === 'error' && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Something went wrong. Please try again.
        </div>
      )}
      
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Your email (optional)"
        className="border rounded px-3 py-2"
      />
      <textarea
        name="message"
        value={formData.message}
        onChange={handleChange}
        placeholder="Your feedback..."
        className="border rounded px-3 py-2 min-h-[100px]"
        required
      />
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2 font-semibold disabled:opacity-50"
      >
        {isSubmitting ? 'Sending...' : 'Send Feedback'}
      </button>
    </form>
  );
}

const Index = () => {
  const { t, i18n } = useTranslation();
  const outlookPdf = i18n.language?.startsWith("es")
    ? "https://aideazz.xyz/Elena_Revicheva_Professional_Outlook_2026_ES.pdf"
    : "https://aideazz.xyz/Elena_Revicheva_Professional_Outlook_2026.pdf";
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);

  const handleStartDemo = () => {
    setShowDemoModal(true);
  };

  const handleUpgradeFromDemo = () => {
    setShowDemoModal(false);
    setShowSubscriptionDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-6 text-center bg-gradient-magical rounded-2xl shadow-vibrant">
        <div className="mx-auto w-32 h-32 mb-4 flex items-center justify-center">
          <img src={brandAvatar2} alt="EspaLuz Avatar" className="w-full h-full rounded-full border-4 border-primary shadow-glow object-cover bg-white" />
        </div>
        {/* Round 4 message, approved by Elena 4 Nov 2026 (cto-aipa docs/espaluz/MESSAGE_DRAFT_2026-11-04.md).
            Replaced: "Emotionally Intelligent Language Coach" headline, AI-tutor cards, "confident in a couple of weeks",
            duplicate demo/Telegram buttons. One offer, palette tokens only. */}
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">{t("hero4.eyebrow")}</p>
        <h1 className="mx-auto mb-5 max-w-4xl px-4 text-3xl font-extrabold leading-tight text-foreground sm:text-4xl md:text-5xl">
          {t("hero4.headline")}
        </h1>
        <p className="mx-auto mb-8 max-w-3xl px-4 text-lg leading-relaxed text-muted-foreground md:text-xl">
          {t("hero4.sub")}
        </p>
        <div className="mx-auto mb-10 flex max-w-xl flex-col items-center gap-3">
          <Link to="/auth?mode=signup"
            className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition hover:opacity-95">
            {t("hero4.cta")}
          </Link>
          <p className="text-sm text-muted-foreground">{t("hero4.price")}</p>
          <Link to="/dashboard" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
            {t("hero4.preview")}
          </Link>
        </div>
        <div className="mx-auto mb-10 grid max-w-5xl gap-4 px-4 text-left md:grid-cols-3">
          {[
            { icon: "🦥", color: "--espaluz-yellow", title: t("hero4.card1Title"), body: t("hero4.card1") },
            { icon: "📒", color: "--espaluz-purple", title: t("hero4.card2Title"), body: t("hero4.card2") },
            { icon: "🏫", color: "--espaluz-green", title: t("hero4.card3Title"), body: t("hero4.card3") },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{ background: `hsl(var(${c.color}) / 0.15)` }} aria-hidden>{c.icon}</span>
              <h2 className="mb-2 text-xl text-foreground">{c.title}</h2>
              <p className="leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mb-8 max-w-3xl px-4 text-lg font-semibold text-foreground">{t("hero4.promiseTitle")}</p>

        {/* WhatsApp Section */}
        <div className="bg-gradient-to-br from-green-50/80 via-white/80 to-emerald-50/80 backdrop-blur-sm rounded-3xl p-8 max-w-4xl mx-auto mb-6 border-2 border-green-200 shadow-2xl">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl md:text-3xl font-bold text-green-600">📱 EspaLuz WhatsApp is Now LIVE!</h3>
              <p className="text-lg text-green-700 font-medium">Start your Spanish learning journey instantly!</p>
            </div>
            
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
              <div className="flex flex-col items-center space-y-4 order-2 lg:order-1">
                <p className="text-base text-gray-700 font-medium max-w-sm text-center">
                  Scan the QR code or click the button to start chatting with EspaLuz on WhatsApp!
                </p>
                <a 
                  href="https://bit.ly/EspaLuz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                    <MessageSquare className="mr-3 h-5 w-5" />
                    💬 Start WhatsApp Chat
                  </Button>
                </a>
              </div>
              
              <div className="flex flex-col items-center space-y-3 order-1 lg:order-2">
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-3xl blur opacity-30 animate-pulse"></div>
                  <img 
                    src={whatsappQr} 
                    alt="EspaLuz WhatsApp QR Code" 
                    className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 object-contain rounded-2xl shadow-magical border-4 border-green-400 hover:border-green-500 hover:shadow-vibrant hover:scale-105 transition-all duration-300 bg-white/95 backdrop-blur-sm ring-2 ring-green-200 hover:ring-green-300" 
                  />
                </div>
                <p className="text-sm text-green-600 font-semibold bg-green-50 px-4 py-2 rounded-full border border-green-200">✨ Scan to chat instantly! ✨</p>
              </div>
            </div>

          </div>
        </div>
      </section>



      {/* Demo Benefits Section */}
      <section className="container mx-auto px-4 py-12 bg-gradient-magical rounded-2xl shadow-vibrant mb-6">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-gradient-primary text-white">20 Free Messages</Badge>
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
      <section className="container mx-auto px-4 py-12 text-center">
        <div className="bg-gradient-to-br from-blue-50/80 via-white/80 to-purple-50/80 backdrop-blur-sm rounded-3xl p-8 max-w-4xl mx-auto border-2 border-blue-200 shadow-2xl">
          <div className="flex flex-col items-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl md:text-3xl font-bold text-blue-600">🚀 Invite your family!</h3>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-3xl blur opacity-30 animate-pulse"></div>
              <img 
                src={espaluzQr} 
                alt="EspaLuz Telegram QR Code" 
                className="relative w-56 h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 object-contain rounded-2xl shadow-magical border-4 border-blue-400 hover:border-blue-500 hover:shadow-vibrant hover:scale-105 transition-all duration-300 bg-white/95 backdrop-blur-sm ring-2 ring-blue-200 hover:ring-blue-300" 
              />
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-blue-600 font-semibold bg-blue-50 px-4 py-2 rounded-full border border-blue-200">Scan to learn on the go!</p>
              <a href="https://t.me/EspaLuzFamily_bot" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  <MessageSquare className="mr-3 h-5 w-5" />
                  🚀 Join Telegram Family
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 rounded-3xl shadow-lg">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-6 text-lg px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
            Living Proof of Concept
          </Badge>
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            EspaLuz - AI Family Tutor
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full mb-6"></div>
          <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-medium">
            Your bilingual AI family tutor — <span className="font-bold text-blue-600">emotionally intelligent</span>, 
            <span className="font-bold text-purple-600"> culturally aware</span>, and ready to help expat families thrive in Spanish-speaking countries, 
            Spanish speakers upgrading their English, and travelers exploring new cultures.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="text-center border-2 border-red-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-red-600 mb-2">Emotionally Intelligent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed font-medium">
                Understands emotional challenges of cultural adaptation and family transitions
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 border-blue-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-blue-600 mb-2">Bilingual Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed font-medium">
                Fluent in English, Spanish, and Russian with instant translation
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 border-green-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-green-600 mb-2">Family-Focused</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed font-medium">
                Personalized support for both children and adults navigating new environments
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 border-purple-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-purple-600 mb-2">Real-time Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed font-medium">
                Voice, text, and image support with avatar videos for children
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="border-border shadow-magical bg-gradient-to-br from-white to-purple-50/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-100/50 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg shadow-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                Current Functionalities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              {[
                { text: "Accepts voice, text, and photos in English, Spanish, and Russian", icon: "🎤", gradient: "from-green-500 to-emerald-500" },
                { text: "Instantly translates messages into both Spanish and English", icon: "⚡", gradient: "from-yellow-500 to-orange-500" },
                { text: "Generates bilingual replies with rich, emotional context", icon: "💬", gradient: "from-blue-500 to-cyan-500" },
                { text: "Creates short avatar videos in Spanish and English for children", icon: "🎬", gradient: "from-purple-500 to-pink-500" },
                { text: "Sends voice messages with AI voice synthesis", icon: "🔊", gradient: "from-indigo-500 to-purple-500" },
                { text: "Translates text inside images (OCR) using GPT-4o vision", icon: "👁️", gradient: "from-rose-500 to-red-500" },
                { text: "Maintains emotional memory throughout conversations", icon: "🧠", gradient: "from-teal-500 to-cyan-500" },
                { text: "Adapts tone based on detected emotions and personal profiles", icon: "❤️", gradient: "from-pink-500 to-rose-500" }
              ].map((feature, index) => (
                <div key={index} className="group flex items-start gap-4 p-3 rounded-xl hover:bg-white/50 transition-all duration-300 hover:shadow-md">
                  <div className={`flex items-center justify-center w-10 h-10 bg-gradient-to-r ${feature.gradient} rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-white text-lg">{feature.icon}</span>
                  </div>
                  <span className="text-gray-700 font-medium leading-relaxed flex-1 group-hover:text-gray-900 transition-colors duration-300">{feature.text}</span>
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

              {/* Demo Video Section */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <h4 className="text-lg font-semibold text-blue-700 mb-4 flex items-center gap-2">
                  🎬 Who is EspaLuz?
                </h4>
                
                {/* Two Video Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  {/* First Video */}
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden shadow-lg">
                      <video 
                        className="w-full h-40"
                        controls
                        playsInline
                        preload="metadata"
                        style={{ backgroundColor: '#000' }}
                      >
                        <source src="https://euyidvolwqmzijkfrplh.supabase.co/storage/v1/object/public/generated-videos/demo.mp4" type="video/mp4" />
                        <p className="flex items-center justify-center h-40 bg-gray-100 text-gray-600 text-center text-sm">
                          🎬 Video loading...
                        </p>
                      </video>
                    </div>
                    <p className="text-xs text-blue-600 text-center font-medium">
                      Meet Your AI Tutor
                    </p>
                  </div>
                  
                  {/* Second Video */}
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden shadow-lg">
                      <video 
                        className="w-full h-40"
                        controls
                        playsInline
                        preload="metadata"
                        style={{ backgroundColor: '#000' }}
                      >
                        <source src="https://euyidvolwqmzijkfrplh.supabase.co/storage/v1/object/public/generated-videos/demo1.mp4" type="video/mp4" />
                        <p className="flex items-center justify-center h-40 bg-gray-100 text-gray-600 text-center text-sm">
                          🎬 Video loading...
                        </p>
                      </video>
                    </div>
                    <p className="text-xs text-blue-600 text-center font-medium">
                      See Family Learning
                    </p>
                  </div>
                </div>
                
                <p className="text-xs text-blue-600 text-center">
                  Watch how families use EspaLuz for real-time Spanish learning
                </p>
              </div>

              <a href="https://t.me/EspaLuzFamily_bot" target="_blank" rel="noopener noreferrer" className="w-full">
                <Button className="w-full" variant="hero">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Open Telegram Chat
                </Button>
              </a>

              {/* WhatsApp Chat Section */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-green-700">WhatsApp</p>
                      <p className="text-xs text-green-600">Live & Ready</p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-700 border-green-300">Live</Badge>
                </div>

                <a href="https://wa.me/50766623757" target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open WhatsApp Chat
                  </Button>
                </a>

                <div className="text-center">
                  <p className="text-sm font-medium text-green-700 bg-green-50 py-2 px-4 rounded-lg border border-green-200">
                    ✨ 14 days free · then $11/month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* EspaLuz Detailed Description Section */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 rounded-3xl shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            🌟 EspaLuz: Your Family's Personal Spanish-English Tutor in WhatsApp or Telegram
          </h2>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Send Messages Your Way */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold text-purple-700 mb-4 flex items-center gap-2">
              📱✨ Send Messages Your Way, Get Learning Magic Back
            </h3>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-start gap-2">
                <span className="text-xl">🎤💬</span>
                <span>Talk or type naturally — in 🇬🇧 English, 🇪🇸 Spanish, or 🇷🇺 Russian — just like talking to a friend</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">👧🧒</span>
                <span>Your kids can ramble, giggle, or ask questions however feels comfortable</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">🔊📖</span>
                <span>Get back profound audio and text responses in Spanish and English</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">👩‍👩‍👦</span>
                <span>Perfect for busy parents who want to practice while 🚗 driving or 🍳 cooking</span>
              </p>
            </div>
          </div>

          {/* Type Anything */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2">
              📝✨ Type Anything – We Make It a Learning Moment
            </h3>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-start gap-2">
                <span className="text-xl">💡</span>
                <span>Text us random thoughts, grocery lists 🛒, or questions about your new country 🌎</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">📚</span>
                <span>Instantly see your message transformed into beautiful bilingual lessons</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">🏥➡️</span>
                <span>"Where's the closest pharmacy?" becomes a cultural adventure 🎉</span>
              </p>
            </div>
          </div>

          {/* Point, Snap, Learn */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold text-green-700 mb-4 flex items-center gap-2">
              📸 Point, Snap, Learn – The World Becomes Your Classroom
            </h3>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-start gap-2">
                <span className="text-xl">🍴</span>
                <span>Take photos of restaurant menus, 🚏 street signs, or 📒 your child's homework</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">🔍</span>
                <span>Watch as we instantly translate everything and explain cultural context 🌐</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">🌟</span>
                <span>Turn every family outing into a Spanish discovery adventure 🎈</span>
              </p>
            </div>
          </div>

          {/* Emotional Learning Companion */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold text-pink-700 mb-4 flex items-center gap-2">
              🎭 Your Family's Emotional Learning Companion
            </h3>
            <h4 className="text-xl font-semibold text-pink-600 mb-3">💖 We Remember How You Feel</h4>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-start gap-2">
                <span className="text-xl">😰</span>
                <span>Stressed about moving to a new country? We adapt with extra patience 🕊️ and encouragement ✨</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">👶</span>
                <span>Kids feeling shy about speaking Spanish? We make it playful 🎲 and confidence-building 💪</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">🏡</span>
                <span>Homesick? We connect your memories 🖼️ to new cultural discoveries 🎶</span>
              </p>
            </div>
          </div>

          {/* Made for Real Families */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold text-indigo-700 mb-4 flex items-center gap-2">
              👨‍👩‍👧‍👦 Made for Real Families
            </h3>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-start gap-2">
                <span className="text-xl">🧑‍💼</span>
                <span>Recognizes if it's Mom asking about work phrases 💼 or little Sofia practicing 🎨 colors</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">👵👦</span>
                <span>Adjusts responses for grandparents, teenagers, or curious toddlers 🐣</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">🤝</span>
                <span>Creates family learning moments that bring everyone together ❤️</span>
              </p>
            </div>
          </div>

          {/* Learning That Comes Alive */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold text-orange-700 mb-4 flex items-center gap-2">
              🎥 Learning That Comes Alive
            </h3>
            <p className="flex items-start gap-2 text-gray-700">
              <span className="text-xl">🎬</span>
              <span>Personalized video lessons — every conversation creates a short, engaging avatar video 🎨 your kid will love 💛</span>
            </p>
          </div>

          {/* Your Personal Coach */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold text-purple-700 mb-4 flex items-center gap-2">
              🗣️ Your Personal Spanish and English Coach
            </h3>
            <h4 className="text-xl font-semibold text-purple-600 mb-3">🌎 Your Cultural Bridge to LATAM</h4>
          </div>

          {/* Country-Specific Wisdom */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold text-green-700 mb-4 flex items-center gap-2">
              🏠 Country-Specific Wisdom
            </h3>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-start gap-2">
                <span className="text-xl">🇲🇽</span>
                <span>Moving to Mexico? Learn about compadrazgo culture 🤝 and proper greetings 👋</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">🇨🇴</span>
                <span>In Colombia? Discover regional food 🍲, transport 🚌, and family customs 🎶</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">🌍</span>
                <span>Covers 20+ Spanish-speaking countries with insider knowledge 📖</span>
              </p>
            </div>
          </div>

          {/* Real-Life Survival Skills */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2">
              🚗 Real-Life Survival Skills
            </h3>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-start gap-2">
                <span className="text-xl">📍</span>
                <span>"How do I tell the taxi driver my address?"</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">🏫</span>
                <span>"What's the polite way to ask for help at my child's school?"</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">👋</span>
                <span>"How do I make friends with other parents in the neighborhood?"</span>
              </p>
            </div>
          </div>

          {/* The Magic Happens Instantly */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold text-orange-700 mb-4 flex items-center gap-2">
              ✨ The Magic Happens Instantly
            </h3>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-start gap-2">
                <span className="text-xl">⚡</span>
                <span>Zero learning curve — just scan QR for WhatsApp or Telegram 🔗 and start chatting on the go 🚀</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">📱</span>
                <span>No apps to download, no passwords 🔑 to remember</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">🌐</span>
                <span>Works on any phone, anywhere in the world</span>
              </p>
            </div>
          </div>

          {/* Always Getting Smarter */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold text-indigo-700 mb-4 flex items-center gap-2">
              🔄 Always Getting Smarter
            </h3>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-start gap-2">
                <span className="text-xl">🧠</span>
                <span>Remembers your family's learning style 🎯 and adjusts</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">📈</span>
                <span>Builds on previous conversations to deepen understanding</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-xl">🌟</span>
                <span>Grows with your family as your Spanish improves 🌹</span>
              </p>
            </div>
          </div>

          {/* Why Families Choose EspaLuz */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 shadow-md border-2 border-orange-200">
            <h3 className="text-2xl font-bold text-orange-700 mb-4 flex items-center gap-2">
              🎯 Why Families Choose EspaLuz
            </h3>
            <div className="space-y-4 text-gray-700">
              <blockquote className="border-l-4 border-orange-400 pl-4 italic">
                <p className="flex items-start gap-2">
                  <span className="text-xl">💬</span>
                  <span>"Finally, a Spanish tutor that understands my 4-year-old's attention span 🧸 AND helps me navigate parent-teacher conferences in Mexico City!" — Maria, expat mom</span>
                </p>
              </blockquote>
              <blockquote className="border-l-4 border-orange-400 pl-4 italic">
                <p className="flex items-start gap-2">
                  <span className="text-xl">💬</span>
                  <span>"It's like having a bilingual best friend 👯‍♀️ who's also a teacher 👩‍🏫, cultural expert 🌎, and patient grandparent 👵 all in one." — Carmen, multigenerational family in Panama</span>
                </p>
              </blockquote>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8 shadow-md border-2 border-purple-200 text-center">
            <h3 className="text-2xl font-bold text-purple-700 mb-4">
              From 🏥 pharmacies to 🏛️ immigration offices... Learn Spanish 🇪🇸 and improve your English 🇬🇧 right where Life happens! 🌍💫
            </h3>
            <div className="space-y-4">
              <p className="text-xl font-semibold text-gray-700">
                👉 Ready to start your learning journey on the go?
              </p>
              <p className="text-lg text-gray-700">
                📲 Just text: <span className="font-bold text-green-600">WhatsApp +507-6662-3757</span> or click the link to Telegram 👉 
                <a href="https://t.me/EspaLuzFamily_bot" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold ml-1">
                  https://t.me/EspaLuzFamily_bot
                </a>
              </p>
              <p className="text-xl font-bold text-orange-600">
                Say "¡Hola!" and watch the magic begin ✨🌟
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                <a href="https://api.whatsapp.com/send/?phone=50766623757" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    💬 Start WhatsApp Chat
                  </Button>
                </a>
                <a href="https://t.me/EspaLuzFamily_bot" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    🚀 Join Telegram
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Pricing Section */}
      <div id="pricing">
        <Pricing />
      </div>

      {/* About the Creator. Light polish 4 Nov 2026 (cto-aipa docs/espaluz/ABOUT_CREATOR_DRAFT_2026-11-04.md):
          same story, palette tokens only, QR opens the portfolio, button opens the Professional Outlook PDF (EN/ES). */}
      <section id="about" className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">{t("creator.eyebrow")}</p>
          <h2 className="mb-10 text-3xl text-foreground md:text-4xl">{t("creator.title")}</h2>

          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
                <p className="text-sm font-semibold text-primary">{t("creator.role")}</p>
                <h3 className="mt-1 text-2xl text-foreground">{t("creator.name")}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{t("creator.intro")}</p>
              </div>

              <div className="rounded-2xl border border-border border-l-4 bg-card p-6" style={{ boxShadow: "var(--shadow-card)", borderLeftColor: "hsl(var(--accent))" }}>
                <h3 className="text-xl text-foreground">{t("creator.journeyTitle")}</h3>
                <p className="mt-2 text-muted-foreground">{t("creator.journeyIntro")}</p>
                <ul className="mt-5 space-y-5">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-2xl" aria-hidden>🏛️</span>
                    <p className="leading-relaxed text-foreground">{t("creator.b1")}</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-2xl" aria-hidden>✈️</span>
                    <div className="leading-relaxed text-foreground">
                      <p>{t("creator.b2")}</p>
                      <ul className="my-2 ml-5 list-disc space-y-1 text-muted-foreground">
                        <li>{t("creator.b2a")}</li>
                        <li>{t("creator.b2b")}</li>
                        <li>{t("creator.b2c")}</li>
                      </ul>
                      <p className="font-medium">{t("creator.b2end")}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-2xl" aria-hidden>💡</span>
                    <div className="space-y-2 leading-relaxed text-foreground">
                      <p><span className="font-semibold">{t("creator.b3lead")}</span> {t("creator.b3")}</p>
                      <p className="text-muted-foreground">{t("creator.b3b")}</p>
                      <p className="font-medium">{t("creator.b3c")}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
                <h3 className="text-lg text-foreground">{t("creator.connectTitle")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("creator.connectBody")}</p>
                <a href="https://aideazz.xyz/portfolio" target="_blank" rel="noopener noreferrer" className="mt-5 block">
                  <img src={portfolioQr} alt="QR code: Elena Revicheva's portfolio" width={192} height={192}
                    className="mx-auto h-48 w-48 rounded-xl border border-border bg-white p-2" />
                </a>
                <p className="mt-2 text-xs text-muted-foreground">{t("creator.scan")}</p>
                <a href={outlookPdf} target="_blank" rel="noopener noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-95">
                  {t("creator.pdf")}
                </a>
                <a href="https://aideazz.xyz/portfolio" target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-primary px-5 py-3 font-semibold text-primary transition hover:bg-primary/5">
                  {t("creator.portfolio")}
                </a>
              </div>

              <div className="rounded-2xl p-6" style={{ background: "hsl(var(--accent) / 0.22)", border: "1px solid hsl(var(--accent))" }}>
                <h3 className="text-lg text-foreground">{t("creator.buildTitle")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{t("creator.buildBody")}</p>
              </div>
            </aside>
          </div>
        </div>
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
              Try EspaLuz Free Trial
              <Badge variant="outline" className="ml-2">20 Free Messages</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <ChatWithEspaluz 
              onUpgradeClick={handleUpgradeFromDemo}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Direct Subscription Dialog */}
      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              🚀 Subscribe to EspaLuz Family!
            </DialogTitle>
          </DialogHeader>
          <SubscriptionFlow
            planType="standard"
            onSuccess={(subscriptionId) => {
              console.log('Subscription successful:', subscriptionId);
              setShowSubscriptionDialog(false);
              // PayPal flow will handle the redirect to auth
            }}
            onError={(error) => {
              console.error('Subscription error:', error);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
