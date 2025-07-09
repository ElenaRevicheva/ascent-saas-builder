import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import spanishLearningHero from "@/assets/spanish-learning-hero.png";

const Hero = () => {
  return (
    <section className="pt-32 pb-16 bg-gradient-hero">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
            Learn Spanish with
            <span className="bg-gradient-primary bg-clip-text text-transparent block">
              AI Family Tutor
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Personalized Spanish lessons for the whole family. Connect via Telegram, 
            or web chat for interactive learning that adapts to your pace and style.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/auth">
              <Button variant="hero" size="xl" className="min-w-[200px]">
                Start Learning
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="#features">
              <Button variant="outline" size="xl" className="min-w-[200px]">
                How It Works
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground mb-16">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              AI-Powered Lessons
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Family-Friendly
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Progress Tracking
            </div>
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-3xl"></div>
          <div className="relative bg-card rounded-2xl shadow-card border border-border overflow-hidden">
            <img 
              src={spanishLearningHero} 
              alt="Spanish Learning AI Tutor Interface" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;