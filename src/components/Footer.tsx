import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-white/60 backdrop-blur-md border-t border-white/60">
      <div className="container mx-auto px-4 py-12">
        {/* 13 Nov 2026 (Elena): the footer's "Contact & Info" card repeated the About section's contact card (PDF, AIdeazz).
            One contact place now (Index.tsx "Contact"); the footer keeps the brand line, copyright and policy links. */}
        <Link to="/" className="mb-3 flex items-center gap-2 text-2xl font-bold text-foreground">
          <img src="/espaluz-icon.svg?v=el4" alt="" className="h-9 w-9 rounded-lg" />
          <span className="brand-wordmark">Espa<b>Luz</b></span>
        </Link>
        <p className="max-w-md text-muted-foreground">{t("footer.tagline")}</p>
        
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