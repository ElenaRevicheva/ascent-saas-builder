import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import heroDashboard from "@/assets/hero-dashboard.png";

const Hero = () => {
  return (
    <section className="pt-32 pb-16 bg-gradient-hero">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
            Build Your SaaS
            <span className="bg-gradient-primary bg-clip-text text-transparent block">
              Faster Than Ever
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Transform your business idea into a scalable SaaS platform with our comprehensive 
            toolkit. Built for modern teams who demand excellence.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/auth">
              <Button variant="hero" size="xl" className="min-w-[200px]">
                Start Building
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="#features">
              <Button variant="outline" size="xl" className="min-w-[200px]">
                Learn More
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground mb-16">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Lightning Fast Setup
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Enterprise Security
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Scale Globally
            </div>
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-3xl"></div>
          <div className="relative bg-card rounded-2xl shadow-card border border-border overflow-hidden">
            <img 
              src={heroDashboard} 
              alt="SaaS Dashboard Preview" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;