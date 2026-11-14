import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Pricing from "@/components/Pricing";
import { CookieConsent } from "@/components/CookieConsent";
import { ChatWithEspaluz } from "@/components/dashboard/ChatWithEspaluz";
import SubscriptionFlow from "@/components/SubscriptionFlow";
import { Part, Item, SectionHead } from "@/components/landing/Tree";
import { HeroClip } from "@/components/landing/HeroClip";
import { TalkingHello } from "@/components/landing/TalkingHello";
import { SkyBackground } from "@/components/landing/SkyBackground";
import heroWeb from '@/assets/heroes/hero-web.mp4';
import heroWebPoster from '@/assets/heroes/hero-web-poster.jpg';
import heroWhatsapp from '@/assets/heroes/hero-whatsapp.mp4';
import heroWhatsappPoster from '@/assets/heroes/hero-whatsapp-poster.jpg';
import heroTelegram from '@/assets/heroes/hero-telegram.mp4';
import heroTelegramPoster from '@/assets/heroes/hero-telegram-poster.jpg';
import heroKids from '@/assets/heroes/hero-kids.mp4';
import heroKidsPoster from '@/assets/heroes/hero-kids-poster.jpg';
import heroRemote from '@/assets/heroes/hero-remote.mp4';
import heroRemotePoster from '@/assets/heroes/hero-remote-poster.jpg';
import heroFamily from '@/assets/heroes/hero-family.mp4';
import heroFamilyPoster from '@/assets/heroes/hero-family-poster.jpg';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Heart, Sparkles, Globe, MessageSquare, Bot, Rocket, Shield, Users, ArrowRight, Play, Star, TrendingUp, Crown, Zap, Briefcase, Plane, Lightbulb, MessageCircle, PenLine, Camera, Video, MapPin, RefreshCw, Mic, Languages, MessagesSquare, Mail, Volume2, Compass, CalendarDays, Smile, NotebookPen, School, Shapes, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { feedbackSchema } from "@/lib/validations";

import brandAvatar2 from '@/assets/brand-avatar-2.jpg';
import telegramQr from '@/assets/telegram-qr-code.png';
import telegramQrVideo from '@/assets/telegram-qr-video.mp4';
import creatorQr from '@/assets/creator-qr-card.png';
import whatsappQr from '@/assets/whatsapp-qr-code.jpg';
import whatsappQrFace from '@/assets/whatsapp-qr-face.gif';

function FeedbackForm() {
  const { t } = useTranslation();
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
      <h3 className="text-2xl font-bold text-purple-700 mb-2">{t("lp.fbTitle")}</h3>
      
      {submitStatus === 'success' && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {t("lp.fbThanks")}
        </div>
      )}
      
      {submitStatus === 'error' && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {t("lp.fbError")}
        </div>
      )}
      
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder={t("lp.fbEmail")}
        className="border rounded px-3 py-2"
      />
      <textarea
        name="message"
        value={formData.message}
        onChange={handleChange}
        placeholder={t("lp.fbMessage")}
        className="border rounded px-3 py-2 min-h-[100px]"
        required
      />
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2 font-semibold disabled:opacity-50"
      >
        {isSubmitting ? t("lp.fbSending") : t("lp.fbSend")}
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
    <div className="landing-type relative isolate min-h-screen">
      <SkyBackground />
      <Navigation />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-6 text-center">
        {/* 5 Nov 2026 (Elena: "a steady picture looks ugly"): moving, photorealistic web hero made in Grok Imagine
            (still from her Warm Smile reference -> 10 s Loop). Replaces the cartoon circle; brand-avatar-2.jpg kept. */}
        <div className="mx-auto mb-6 w-52 sm:w-60 md:w-64">
          <div className="hero-seat" style={{ aspectRatio: "540 / 804" }}>
            <HeroClip src={heroWeb} poster={heroWebPoster} label="EspaLuz, your family's companion on the web" className="block h-full w-full object-cover" />
          </div>
        </div>
        <div className="-mt-3 mb-6"><TalkingHello variant="landing" /></div>
        {/* Round 4 message, approved by Elena 4 Nov 2026 (cto-aipa docs/espaluz/MESSAGE_DRAFT_2026-11-04.md).
            Replaced: "{t("lp.s1")} Language Coach" headline, AI-tutor cards, "confident in a couple of weeks",
            duplicate demo/Telegram buttons. One offer, palette tokens only. */}
        <p className="mx-auto mb-4 max-w-3xl px-4 text-base font-medium leading-relaxed text-primary md:text-lg">{t("hero4.eyebrow")}</p>
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
            { icon: Shapes, color: "--espaluz-yellow", title: t("hero4.card1Title"), body: t("hero4.card1"), kids: true },
            { icon: NotebookPen, color: "--espaluz-purple", title: t("hero4.card2Title"), body: t("hero4.card2"),
              clip: { src: heroRemote, poster: heroRemotePoster, label: "Working remotely by the window while the child learns with Pere and Titi" } },
            { icon: School, color: "--espaluz-green", title: t("hero4.card3Title"), body: t("hero4.card3"),
              clip: { src: heroFamily, poster: heroFamilyPoster, label: "The whole family celebrating together at a restaurant in Panama City" } },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
              {"kids" in c && (
                <Link to="/classroom" className="hero-seat mb-4 block" style={{ aspectRatio: "720 / 484", borderRadius: "1.25rem" }} aria-label="Open the kids classroom with Pere and Titi">
                  <HeroClip src={heroKids} poster={heroKidsPoster} label="Pere and Titi in the kids classroom" className="block h-full w-full object-cover" />
                </Link>
              )}
              {/* 5 Nov 2026 (Elena: these two cards "look very lonely"): remote work by the open window with the child
                  learning nearby, and the whole family (husband too) celebrating at a busy city restaurant with palms - Grok Imagine loops. */}
              {"clip" in c && c.clip && (
                <div className="hero-seat mb-4" style={{ aspectRatio: "720 / 484", borderRadius: "1.25rem" }}>
                  <HeroClip src={c.clip.src} poster={c.clip.poster} label={c.clip.label} className="block h-full w-full object-cover" />
                </div>
              )}
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{ background: `hsl(var(${c.color}) / 0.15)` }} aria-hidden>
                {/* 14 Nov 2026 (Elena: generic emojis look toyish) - brand line icons, same family as the dashboard map. */}
                <c.icon className="h-6 w-6" style={{ color: `hsl(var(${c.color}))`, filter: "brightness(0.75) saturate(1.2)" }} />
              </span>
              <h2 className="mb-2 text-xl text-foreground">{c.title}</h2>
              <p className="leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mb-8 max-w-3xl px-4 text-lg font-semibold text-foreground">{t("hero4.promiseTitle")}</p>

      </section>



      {/* Ways to start (tree): one part, three items - WhatsApp open first. Blocks moved here unchanged. */}
      <section id="start" className="container mx-auto scroll-mt-20 px-4 py-14">
        <SectionHead eyebrow={t("tree.startEyebrow")} title={t("tree.startTitle")} lede={t("tree.startLede")} />
        <div className="mx-auto max-w-5xl">
          <Part tag={t("tree.startTag")} name={t("tree.startPart")} count={t("tree.count5")}>
            <Item group="start" defaultOpen title={<h3 className="text-lg font-semibold text-foreground">{t("tree.wa")}</h3>}>
            <div className="bg-gradient-to-br from-green-50/80 via-white/80 to-emerald-50/80 backdrop-blur-sm rounded-2xl p-5 border border-green-200">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl md:text-3xl font-bold text-green-600">{t("lp.waTitle")}</h3>
              <p className="text-lg text-green-700 font-medium">{t("lp.waSub")}</p>
            </div>
            
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
              <div className="flex flex-col items-center space-y-4 order-2 lg:order-1">
                <div className="hero-seat w-40 md:w-48" style={{ aspectRatio: "540 / 804" }}>
                  <HeroClip src={heroWhatsapp} poster={heroWhatsappPoster} label="EspaLuz on WhatsApp" className="block h-full w-full object-cover" />
                </div>
                <p className="text-base text-gray-700 font-medium max-w-sm text-center">
                  {t("lp.waScanText")}
                </p>
                <a 
                  href="https://bit.ly/EspaLuz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                    <MessageSquare className="mr-3 h-5 w-5" />
                    {t("lp.waButton")}
                  </Button>
                </a>
              </div>
              
              <div className="flex flex-col items-center space-y-3 order-1 lg:order-2">
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-3xl blur opacity-30 animate-pulse"></div>
                  {/* 5 Nov 2026 (Elena): her "Warm Smile in Nine Frames" GIF moves in the centre of the QR, laid exactly over the
                      still face (square 414-724 px of the 1138 px QR = 36.38 % / 27.24 %). All 9 frames scan to bit.ly/EspaLuz at
                      1138, 256, 192 and 140 px. The wrapper scales on hover so the GIF stays aligned. */}
                  <span className="relative block transition-transform duration-300 hover:scale-105">
                    <img 
                      src={whatsappQr} 
                      alt="EspaLuz WhatsApp QR Code" 
                      className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 object-contain rounded-2xl shadow-magical border-4 border-green-400 hover:border-green-500 hover:shadow-vibrant transition-all duration-300 bg-white/95 backdrop-blur-sm ring-2 ring-green-200 hover:ring-green-300" 
                    />
                    <span aria-hidden className="pointer-events-none absolute inset-[4px]">
                      <img src={whatsappQrFace} alt="" className="absolute" style={{ left: "36.38%", top: "36.38%", width: "27.24%", height: "27.24%" }} />
                    </span>
                  </span>
                </div>
                <p className="text-sm text-green-600 font-semibold bg-green-50 px-4 py-2 rounded-full border border-green-200">{t("lp.waScan")}</p>
              </div>
            </div>

          </div>
        </div>
            </Item>
            <Item group="start" title={<h3 className="text-lg font-semibold text-foreground">{t("tree.tg")}</h3>}>
              <div className="text-center">
        <div className="bg-gradient-to-br from-blue-50/80 via-white/80 to-purple-50/80 backdrop-blur-sm rounded-2xl p-5 border border-blue-200">
          <div className="flex flex-col items-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl md:text-3xl font-bold text-blue-600">{t("lp.tgTitle")}</h3>
            </div>
            
            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
            <div className="hero-seat w-40 md:w-48" style={{ aspectRatio: "540 / 804" }}>
              <HeroClip src={heroTelegram} poster={heroTelegramPoster} label="EspaLuz on Telegram" className="block h-full w-full object-cover" />
            </div>
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-3xl blur opacity-30 animate-pulse"></div>
              {/* 5 Nov 2026 (Elena): Telegram QR in the WhatsApp QR's style, Telegram blue (scripts/make-telegram-qr.py),
                  t.me/EspaLuzFamily_bot. Her mother-and-daughter video plays muted in the centre square (36.38 % / 27.24 %);
                  20 sampled frames all scan at 1138/288/224/160 px. Old espaluz-qr.jpg kept (sidebar still uses it). */}
              <span className="relative block transition-transform duration-300 hover:scale-105">
                <img 
                  src={telegramQr} 
                  alt="EspaLuz Telegram QR Code" 
                  className="relative w-56 h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 object-contain rounded-2xl shadow-magical border-4 border-blue-400 hover:border-blue-500 hover:shadow-vibrant transition-all duration-300 bg-white/95 backdrop-blur-sm ring-2 ring-blue-200 hover:ring-blue-300" 
                />
                <span aria-hidden className="pointer-events-none absolute inset-[4px]">
                  <video src={telegramQrVideo} autoPlay muted loop playsInline preload="metadata" className="absolute object-cover"
                    style={{ left: "36.38%", top: "36.38%", width: "27.24%", height: "27.24%" }} />
                </span>
              </span>
            </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-blue-600 font-semibold bg-blue-50 px-4 py-2 rounded-full border border-blue-200">{t("lp.tgScan")}</p>
              <a href="https://t.me/EspaLuzFamily_bot" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  <MessageSquare className="mr-3 h-5 w-5" />
                  {t("lp.tgButton")}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
            </Item>
            <Item group="start" title={<h3 className="text-lg font-semibold text-foreground">{t("tree.demo")}</h3>}>
              
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-gradient-primary text-white">{t("lp.demoBadge")}</Badge>
          <h2 className="text-3xl font-bold mb-3 text-primary">
            {t("lp.demoTitle")}
          </h2>
          <p className="text-base text-foreground max-w-3xl mx-auto mb-6">
            <Trans i18nKey="lp.demoIntro" components={{ b: <strong /> }} />
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-purple-700 mb-6">{t("lp.demoH")}</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                </div>
                <span className="text-lg">{t("lp.demo1")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                </div>
                <span className="text-lg">{t("lp.demo2")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                </div>
                <span className="text-lg">{t("lp.demo3")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                </div>
                <span className="text-lg">{t("lp.demo4")}</span>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
              <div className="flex items-center gap-3 mb-3">
                <Crown className="h-6 w-6 text-orange-600" />
                <span className="text-lg font-bold text-orange-700">
                  {t("lp.keepTitle")}
                </span>
              </div>
              <ul className="text-sm space-y-2 text-gray-700">
                <li><strong>{t("lp.keep1")}</strong></li>
                <li>{t("lp.keep2")}</li>
                <li>{t("lp.keep3")}</li>
                <li>{t("lp.keep4")}</li>
                <li>{t("lp.keep5")}</li>
                <li>{t("lp.keep6")}</li>
              </ul>
            </div>
          </div>
          
          <Card className="bg-white border-2 border-purple-200 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <Badge className="mb-3 bg-purple-500 text-white">
                <Star className="h-3 w-3 mr-1" />
                {t("lp.livePreview")}
              </Badge>
              <CardTitle className="text-2xl text-purple-700">{t("lp.expTitle")}</CardTitle>
              <CardDescription className="text-gray-600">
                {t("lp.expSub")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  <span className="text-sm">{t("lp.exp1")}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Heart className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">{t("lp.exp2")}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                  <span className="text-sm">{t("lp.exp3")}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <Globe className="h-5 w-5 text-orange-600" />
                  <span className="text-sm">{t("lp.exp4")}</span>
                </div>
              </div>
              
              <Button 
                onClick={handleStartDemo}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold py-3"
              >
                <Zap className="mr-2 h-4 w-4" />
                {t("lp.demoStart")}
              </Button>
              
              <p className="text-xs text-center text-gray-500 mt-2">
                {t("lp.demoNote")}
              </p>
            </CardContent>
          </Card>
        </div>
      
            </Item>
            <Item group="start" title={<h3 className="text-lg font-semibold text-foreground">{t("lp.todayTitle")}</h3>}>
              
            <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {t("lp.todayTitle")}
              </CardTitle>
              <CardDescription>
                {t("lp.todaySub")}
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
                      <p className="text-xs text-muted-foreground">{t("lp.liveReady")}</p>
                    </div>
                  </div>
                  <Badge variant="default">{t("lp.live")}</Badge>
                </div>
              </div>

              {/* Demo Video Section */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <h4 className="text-lg font-semibold text-blue-700 mb-4 flex items-center gap-2">
                  {t("lp.whoTitle")}
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
                        <source src="/videos/demo.mp4" type="video/mp4" />
                        <p className="flex items-center justify-center h-40 bg-gray-100 text-gray-600 text-center text-sm">
                          {t("lp.videoLoading")}
                        </p>
                      </video>
                    </div>
                    <p className="text-xs text-blue-600 text-center font-medium">
                      {t("lp.video1")}
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
                        <source src="/videos/demo1.mp4" type="video/mp4" />
                        <p className="flex items-center justify-center h-40 bg-gray-100 text-gray-600 text-center text-sm">
                          {t("lp.videoLoading")}
                        </p>
                      </video>
                    </div>
                    <p className="text-xs text-blue-600 text-center font-medium">
                      {t("lp.video2")}
                    </p>
                  </div>
                </div>
                
                <p className="text-xs text-blue-600 text-center">
                  {t("lp.videoNote")}
                </p>
              </div>

              <a href="https://t.me/EspaLuzFamily_bot" target="_blank" rel="noopener noreferrer" className="w-full">
                <Button className="w-full" variant="hero">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t("lp.openTg")}
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
                      <p className="text-xs text-green-600">{t("lp.liveReady")}</p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-700 border-green-300">{t("lp.live")}</Badge>
                </div>

                <a href="https://wa.me/50766623757" target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t("lp.openWa")}
                  </Button>
                </a>

                <div className="text-center">
                  <p className="text-sm font-medium text-green-700 bg-green-50 py-2 px-4 rounded-lg border border-green-200">
                    {t("lp.priceLine")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
            </Item>
            <Item group="start" title={<h3 className="text-lg font-semibold text-foreground">{t("tree.ctaPart")}</h3>}>
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8 shadow-md border-2 border-purple-200 text-center">
            <h3 className="text-2xl font-bold text-purple-700 mb-4">
              {t("lp.holaTitle")}
            </h3>
            <div className="space-y-4">
              <p className="text-xl font-semibold text-gray-700">
                {t("lp.holaReady")}
              </p>
              <p className="text-lg text-gray-700">
                {t("lp.holaText1")} <span className="font-bold text-green-600">WhatsApp +507-6662-3757</span> {t("lp.holaText2")} 
                <a href="https://t.me/EspaLuzFamily_bot" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold ml-1 [overflow-wrap:anywhere]">
                  https://t.me/EspaLuzFamily_bot
                </a>
              </p>
              <p className="text-xl font-bold text-orange-600">
                {t("lp.holaSay")}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                <a href="https://api.whatsapp.com/send/?phone=50766623757" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t("lp.waButton")}
                  </Button>
                </a>
                <a href="https://t.me/EspaLuzFamily_bot" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t("lp.joinTg")}
                  </Button>
                </a>
              </div>
            </div>
          </div>
            </Item>
          </Part>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto scroll-mt-20 px-4 py-20 bg-white/30 backdrop-blur-[2px] border border-white/50 rounded-3xl shadow-[0_24px_60px_-30px_rgba(91,63,209,.35)]">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-6 text-lg px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
            {t("lp.featBadge")}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {t("lp.featTitle")}
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full mb-6"></div>
          <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-medium">
            <Trans i18nKey="lp.featLede" components={{ b1: <span className="font-bold text-blue-600" />, b2: <span className="font-bold text-purple-600" /> }} />
          </p>
        </div>

        <div className="mx-auto max-w-6xl space-y-4">
          <Part tag={t("tree.featTag")} name={t("tree.strengths")} count={t("tree.count4")}>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center border-2 border-red-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-red-600 mb-2">{t("lp.s1")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed font-medium">
                {t("lp.s1d")}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 border-blue-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-blue-600 mb-2">{t("lp.s2")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed font-medium">
                {t("lp.s2d")}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 border-green-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-green-600 mb-2">{t("lp.s3")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed font-medium">
                {t("lp.s3d")}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 border-purple-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-purple-600 mb-2">{t("lp.s4")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed font-medium">
                {t("lp.s4d")}
              </p>
            </CardContent>
          </Card>
        </div>
          </Part>
          <Part tag={t("tree.featTag")} name={t("lp.funcTitle")} count={t("tree.count10")}>
            <Card className="border-border shadow-magical bg-gradient-to-br from-white to-purple-50/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-100/50 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg shadow-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                {t("lp.funcTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              {[
                // 9 Nov 2026 (Elena): only what the code does today; the first three lines kept from before, polished.
                { text: t("lp.f1"), icon: Mic, gradient: "from-green-500 to-emerald-500" },
                { text: t("lp.f2"), icon: Languages, gradient: "from-yellow-500 to-orange-500" },
                { text: t("lp.f3"), icon: MessagesSquare, gradient: "from-blue-500 to-cyan-500" },
                { text: t("lp.f4"), icon: Camera, gradient: "from-rose-500 to-red-500" },
                { text: t("lp.f5"), icon: Mail, gradient: "from-teal-500 to-cyan-500" },
                { text: t("lp.f6"), icon: Volume2, gradient: "from-indigo-500 to-purple-500" },
                { text: t("lp.f7"), icon: Video, gradient: "from-purple-500 to-pink-500" },
                { text: t("lp.f8"), icon: Compass, gradient: "from-sky-500 to-blue-500" },
                { text: t("lp.f9"), icon: CalendarDays, gradient: "from-amber-500 to-orange-500" },
                { text: t("lp.f10"), icon: Smile, gradient: "from-pink-500 to-rose-500" }
              ].map((feature, index) => (
                <div key={index} className="group flex items-start gap-4 p-3 rounded-xl hover:bg-white/50 transition-all duration-300 hover:shadow-md">
                  {/* 14 Nov 2026 (Elena): the rainbow gradient balls were last year's toy style - one brand chip, like the map. */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="text-gray-700 font-medium leading-relaxed flex-1 group-hover:text-gray-900 transition-colors duration-300">{feature.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          </Part>
          
        </div>
      </section>

      {/* EspaLuz Detailed Description Section */}
      <section id="life" className="container mx-auto scroll-mt-20 px-4 py-16 bg-white/30 backdrop-blur-[2px] border border-white/50 rounded-3xl shadow-[0_24px_60px_-30px_rgba(91,63,209,.35)]">
        <div className="text-center mb-8">
          {/* 13 Nov 2026 (Elena): "overwhelmed with emojis, toyish". Chat emojis -> the brand globe + palette icon chips. */}
          <h2 className="text-4xl font-bold text-foreground mb-6">
            <img src="/espaluz-icon.svg?v=el4" alt="" aria-hidden className="mr-3 inline-block h-11 w-11 align-[-0.2em]" />
            {t("lp.lifeTitle")}
          </h2>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {/* 13 Nov 2026 (Elena): calmer lines approved; topic 7 (empty, repeated 1 and 8) and 9 (generic questions any
              search engine answers) removed. One list drives the cards, so the count cannot drift from what is shown. */}
          {(() => {
            const topics = [
              [MessageCircle, "l1", "abcd"], [PenLine, "l2", "abc"], [Camera, "l3", "ab"], [Heart, "l4", "ab"],
              [Users, "l5", "abc"], [Video, "l6", "a"], [MapPin, "l8", "ab"], [Zap, "l10", "abc"], [RefreshCw, "l11", "abc"],
            ] as const;
            return (
              <Part tag={t("tree.lifeTag")} name={t("tree.lifePart")} count={t("tree.topics", { n: topics.length })}>
                {topics.map(([Icon, k, lines], i) => (
                  <Item key={k} group="life" defaultOpen={i === 0} title={<span className="flex items-center gap-3"><span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><h3 className="text-lg font-semibold text-foreground">{t(`lp.${k}`)}</h3></span>}>
                    <div className="space-y-3 text-gray-700">
                      {lines.split("").map((x) => (
                        <p key={x} className="flex items-start gap-2">
                          <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                          <span>{t(`lp.${k}${x}`)}</span>
                        </p>
                      ))}
                    </div>
                  </Item>
                ))}
              </Part>
            );
          })()}
          {/* 10 Nov 2026 (Elena): the two quotes here ("Maria", "Carmen") were not from real people - removed.
              Only real, permitted family words go back in this place. */}
          
        </div>
      </section>



      {/* Pricing Section */}
      <div id="pricing" className="scroll-mt-20">
        <Pricing />
      </div>

      {/* About the Creator. Light polish 4 Nov 2026 (cto-aipa docs/espaluz/ABOUT_CREATOR_DRAFT_2026-11-04.md):
          same story, palette tokens only, QR opens the portfolio, button opens the Professional Outlook PDF (EN/ES). */}
      <section id="about" className="container mx-auto scroll-mt-20 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">{t("creator.eyebrow")}</p>
          <h2 className="mb-10 text-3xl text-foreground md:text-4xl">{t("creator.title")}</h2>

          <div className="space-y-4">
            <div className="space-y-4">
{/* 13 Nov 2026 (Elena): one card, not two. Credentials first, the origin with dignity, then what it means for a family.
    Approved text; no hardship framing, only claims that are live today. */}
<Part className="border-l-4" tag={t("creator.tag")} name={t("creator.name")} count={t("creator.sub")}>
                <p className="mt-1 text-sm font-semibold leading-snug text-primary">{t("creator.role")}</p>
                <div className="mt-4 space-y-3 leading-relaxed text-foreground">
                  <p>{t("creator.story1")}</p>
                  <p>{t("creator.story2")}</p>
                </div>
                <p className="mt-6 font-semibold text-foreground">{t("creator.meansTitle")}</p>
                <ul className="mt-3 space-y-4">
                  {([[Lightbulb, "m1"], [Shield, "m2"], [Heart, "m3"]] as const).map(([Icon, k]) => (
                    <li key={k} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden><Icon className="h-5 w-5" /></span>
                      <p className="leading-relaxed text-foreground"><span className="font-semibold">{t(`creator.${k}Lead`)}</span> {t(`creator.${k}`)}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 font-medium leading-relaxed text-foreground">{t("creator.closing")}</p>
              </Part>
            </div>


          </div>
        </div>

        {/* 5 Nov 2026 (Elena): the AIdeazz blocks that sat under the plans belong with the creator. Moved here unchanged, closed. */}
        <div className="mx-auto mt-6 max-w-5xl space-y-4">
          {/* 13 Nov 2026 (Elena): "Our philosophy", "The Birthplace of EspaLuz" and "Join the Revolution" said the same thing in
              2024 words ("in development", "revolution", "emotional AI"). One lab card, live claims only. The AIPA video stays
              untouched on her request (backup: creatives/aipa-demo-video-20261113 + OneDrive). */}
          <Part tag={t("lab.tag")} name={t("lab.title")} count={t("lab.sub")}>
            <div className="mx-auto max-w-3xl space-y-5 py-2">
              <p className="text-lg leading-relaxed text-foreground">{t("lab.intro")}</p>
              <ul className="space-y-4">
                {([[Heart, "l1"], [Brain, "l2"], [Shield, "l3"], [Star, "l4"]] as const).map(([Icon, k]) => (
                  <li key={k} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden><Icon className="h-5 w-5" /></span>
                    <p className="leading-relaxed text-foreground"><span className="font-semibold">{t(`lab.${k}Lead`)}</span> {t(`lab.${k}`)}</p>
                  </li>
                ))}
              </ul>
            </div>
            {/* 13 Nov 2026 (Elena): the AIPA demo video is off the page (old-fashioned). The file stays in public/videos and is
                backed up in creatives/aipa-demo-video-20261113 + OneDrive. */}
            
            {/* 13 Nov 2026 (Elena): no "Partners and investors: aideazz.xyz" line - the main site is not current. */}
          </Part>
<Part tag={t("tree.contactTag")} name={t("creator.connectTitle")} count={t("lp.contactCount")}>            <aside className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
                <h3 className="text-lg text-foreground">{t("creator.connectTitle")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("creator.connectBody")}</p>
                {/* Elena 4 Nov: keep the glowing, pulsing card. Glow runs violet -> sun on the palette tokens. */}
                {/* Elena 5 Nov: her own QR design, re-encoded to aideazz.xyz/card (a redirect she owns -> /portfolio).
                    Change where it lands in aideazz public/_redirects, never by reprinting. Rebuild: scripts/make-creator-qr.py */}
                <a href="https://aideazz.xyz/card" target="_blank" rel="noopener noreferrer" className="relative mx-auto mt-6 block w-56">
                  <span aria-hidden className="absolute -inset-3 rounded-3xl opacity-30 blur-md animate-pulse"
                    style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }} />
                  <img src={creatorQr} alt="QR code: Elena Revicheva's portfolio" width={224} height={224}
                    className="relative h-56 w-56 rounded-2xl border-4 border-primary bg-white object-contain p-1 shadow-xl transition-transform duration-300 hover:scale-105" />
                </a>
                <p className="mt-2 text-xs text-muted-foreground">{t("creator.scan")}</p>
                <a href={outlookPdf} target="_blank" rel="noopener noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-95">
                  {t("creator.pdf")}
                </a>
                {/* 13 Nov 2026 (Elena): one contact place - YouTube + AIdeazz (= her SOP AI Ops page with all agents; Spanish page for es) came from the footer's duplicate "Contact & Info" card. */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
                  <a href="https://www.youtube.com/@AIdeazz" target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-3 py-2 text-foreground transition hover:border-primary">YouTube</a>
                  <a href={i18n.language?.startsWith("es") ? "https://aideazz.xyz/sop-ai-ops-es.html" : "https://aideazz.xyz/sop-ai-ops.html"} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-3 py-2 text-foreground transition hover:border-primary">AIdeazz</a>
                </div>
              </div>

</aside></Part>
        </div>
      </section>

      {/* 14 Nov 2026 (Elena: unequal gap before this card) - same width and spacing as the cards above it. */}
      <div id="feedback" className="container mx-auto -mt-12 scroll-mt-20 px-4 pb-12">
        <Part tag={t("tree.feedbackTag")} name={t("tree.feedback")}>
          <FeedbackForm />
        </Part>
      </div>
      <Footer />
      <CookieConsent />
      
      {/* Demo Modal */}
      <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center">
              <MessageSquare className="h-5 w-5 text-orange-500" />
              {t("lp.modalTitle")}
              <Badge variant="outline" className="ml-2">{t("lp.demoBadge")}</Badge>
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
              {t("lp.subTitle")}
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
