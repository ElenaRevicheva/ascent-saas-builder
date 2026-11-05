import { Link } from "react-router-dom";
import { Part } from "@/components/landing/Tree";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        {/* 5 Nov 2026 (Elena): footer info folds like the rest of the page; copyright + policy links stay visible. */}
        <Part tag="EspaLuz" name="Contact & Info" count="YouTube · Telegram · AIdeazz · PDF">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="text-2xl font-bold text-foreground mb-4 block flex items-center gap-2">
              {/* 3 Nov 2026: EspaLuz's globe icon instead of 🇪🇸 (Windows shows that emoji as the letters "ES"). */}
              <img src="/espaluz-icon.svg?v=el4" alt="" className="h-9 w-9 rounded-lg" />
              EspaLuz
            </Link>
            <p className="text-muted-foreground mb-4 max-w-md">
              EspaLuz: live your new country in Spanish, with your family. On the web, WhatsApp and Telegram.
            </p>
            <div className="flex space-x-6">
              <a href="https://www.youtube.com/@AIdeazz" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <span className="text-lg">📺</span>
                <span className="font-semibold">YouTube</span>
              </a>
              <a href="https://t.me/EspaLuz" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 px-4 py-2 bg-[#0088cc] hover:bg-[#006ba3] text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <span className="text-lg">✈️</span>
                <span className="font-semibold">Telegram</span>
              </a>
            </div>
          </div>
          
          {/* Product column hidden for MVP */}
          
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact & Info</h3>
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">EspaLuz is made by AIdeazz. More about us and the founder:</p>
              <div className="space-y-3">
                {/* 4 Nov 2026: palette tokens; the founder link opens the Professional Outlook PDF (was the business card). */}
                <a href="https://www.aideazz.xyz" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">AI</span>
                  <span className="font-medium text-foreground">AIdeazz</span>
                  <span className="ml-auto text-primary">→</span>
                </a>
                <a href="https://aideazz.xyz/Elena_Revicheva_Professional_Outlook_2026.pdf" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm" style={{ background: "hsl(var(--accent))" }}>👤</span>
                  <span className="font-medium text-foreground">Elena Revicheva: Professional outlook (PDF)</span>
                  <span className="ml-auto text-primary">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
        </Part>
        
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © 2026 EspaLuz by AIdeazz, Panama. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;