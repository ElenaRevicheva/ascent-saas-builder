import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Navigation = () => {
  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-foreground flex items-center gap-2">
          🇪🇸 EspaLuz
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          <Link to="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link to="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link to="#about" className="text-muted-foreground hover:text-foreground transition-colors">
            About
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <Link to="/auth">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link to="/auth">
            <Button variant="hero">Get Started</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;