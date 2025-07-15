import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="text-2xl font-bold text-foreground mb-4 block flex items-center gap-2">
              🇪🇸 EspaLuz
            </Link>
            <p className="text-muted-foreground mb-4 max-w-md">
              Empowering families to learn Spanish together with AI-powered tutoring 
              that adapts to every learning style and pace.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.youtube.com/@AIdeazz" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                YouTube
              </a>
              <a href="https://t.me/EspaLuz" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                Telegram
              </a>
            </div>
          </div>
          
          {/* Product column hidden for MVP */}
          
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact & Info</h3>
            <div className="space-y-2">
              <span className="block text-muted-foreground">EspaLuz is part of the AIdeazz ecosystem. Find more info and contact options below:</span>
              <a href="https://www.aideazz.xyz" target="_blank" rel="noopener noreferrer" className="block text-muted-foreground hover:text-primary transition-colors">
                AIdeazz Ecosystem
              </a>
              <a href="https://lit.link/en/aideazz" target="_blank" rel="noopener noreferrer" className="block text-muted-foreground hover:text-primary transition-colors">
                Founder: Elena Revicheva (Business Card)
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © 2024 EspaLuz AI Family Tutor. All rights reserved.
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