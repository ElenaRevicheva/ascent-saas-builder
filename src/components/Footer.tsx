import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Part } from "@/components/landing/Tree";

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-white/60 backdrop-blur-md border-t border-white/60">
      <div className="container mx-auto px-4 py-12">
        {/* 5 Nov 2026 (Elena): footer info folds like the rest of the page; copyright + policy links stay visible. */}
        <Part tag="EspaLuz" name={t("footer.contact")} count="YouTube · Telegram · AIdeazz · PDF">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="text-2xl font-bold text-foreground mb-4 block flex items-center gap-2">
              {/* 3 Nov 2026: EspaLuz's globe icon instead of 🇪🇸 (Windows shows that emoji as the letters "ES"). */}
              <img src="/espaluz-icon.svg?v=el4" alt="" className="h-9 w-9 rounded-lg" />
              <span className="brand-wordmark">Espa<b>Luz</b></span>
            </Link>
            <p className="text-muted-foreground mb-4 max-w-md">
              {t("footer.tagline")}
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
            <h3 className="font-semibold text-foreground mb-4">{t("footer.contact")}</h3>
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{t("footer.madeBy")}</p>
              <div className="space-y-3">
                {/* 4 Nov 2026: palette tokens; the founder link opens the Professional Outlook PDF (was the business card). */}
                <a href="https://www.aideazz.xyz" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">AI</span>
                  <span className="font-medium text-foreground">AIdeazz</span>
                  <span className="ml-auto text-primary">→</span>
                </a>
                <a href="https://aideazz.xyz/Elena_Revicheva_Professional_Outlook_2026.pdf" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm" style={{ background: "hsl(var(--accent))" }}>👤</span>
                  <span className="font-medium text-foreground">{t("footer.outlook")}</span>
                  <span className="ml-auto text-primary">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
        </Part>
        
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            {t("footer.rights")}
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              {t("footer.privacy")}
            </Link>
            <Link to="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;