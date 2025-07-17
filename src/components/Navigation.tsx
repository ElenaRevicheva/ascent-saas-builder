import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";

const Navigation = () => {
  const { t } = useTranslation();

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-foreground flex items-center gap-2">
          🇪🇸 EspaLuz
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.features")}
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.pricing")}
          </a>
          <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.about")}
          </a>
        </div>

        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
          <Link to="/auth">
            <Button variant="ghost">{t("nav.signIn")}</Button>
          </Link>
          <Link to="/auth">
            <Button variant="hero">{t("nav.getStarted")}</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;