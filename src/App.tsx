import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { trackDoorClicks, trackRoute } from "@/lib/track";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthConfirm from "./pages/AuthConfirm";
import Dashboard from "./pages/Dashboard";
import LearningModule from "./pages/LearningModule";
import ConnectBot from "./pages/ConnectBot";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionComplete from "./pages/SubscriptionComplete";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Classroom from "./pages/Classroom";

trackDoorClicks();

const RouteCounter = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    trackRoute(pathname);
  }, [pathname]);
  return null;
};

// 8 Nov 2026: a new page opens at its top (React Router keeps the old scroll position otherwise), except when the link
// asks for a place on the page (#chat, or the "go to chat" state - those scroll themselves a moment later).
// 8 Nov 2026 (Elena, signed in on her own account: "it takes me to the middle where referrals are"): on a reload or a
// reopened tab the BROWSER put back the last scroll spot (measured: 3600 px = "Refer Friends"), after our scrollTo(0,0).
// 'manual' tells the browser to stop doing that, so every full page load starts at the top too.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouteCounter />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/confirm" element={<AuthConfirm />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/learning/:moduleId" element={<LearningModule />} />
        <Route path="/connect-bot" element={<ConnectBot />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/subscription-success" element={<SubscriptionSuccess />} />
        <Route path="/subscription-complete" element={<SubscriptionComplete />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/classroom" element={<Classroom />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
