import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MessageSquare, 
  Users, 
  BarChart3, 
  Bot, 
  Smartphone, 
  Globe,
  BookOpen,
  Trophy,
  Heart
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Bot,
      title: "AI Spanish Tutor",
      description: "Personalized AI tutor that adapts to your learning style and pace, available 24/7 for instant help."
    },
    {
      icon: MessageSquare,
      title: "Multi-Platform Chat",
      description: "Learn via Telegram or web chat. Practice Spanish anywhere, anytime."
    },
    {
      icon: Users,
      title: "Family Learning",
      description: "Designed for families. Different difficulty levels for kids and adults learning together."
    },
    {
      icon: BarChart3,
      title: "Progress Tracking",
      description: "Detailed analytics on your Spanish learning journey with vocabulary and grammar progress."
    },
    {
      icon: BookOpen,
      title: "Interactive Lessons",
      description: "Engaging conversations, vocabulary games, and real-world Spanish practice scenarios."
    },
    {
      icon: Trophy,
      title: "Achievement System",
      description: "Earn badges and track milestones as you progress from beginner to fluent Spanish speaker."
    },
    {
      icon: Smartphone,
      title: "Mobile Learning",
      description: "Practice Spanish on your phone, tablet, or computer. Sync progress across all devices."
    },
    {
      icon: Globe,
      title: "Cultural Context",
      description: "Learn Spanish with cultural insights from Spain and Latin America for authentic communication."
    },
    {
      icon: Heart,
      title: "Emotional Learning",
      description: "AI tracks your mood and emotional state to provide encouraging and supportive learning experiences."
    }
  ];

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Why Choose
            <span className="bg-gradient-primary bg-clip-text text-transparent"> EspaLuz</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Revolutionary AI-powered Spanish learning designed for modern families. 
            Learn together, progress faster, and speak Spanish with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-border hover:shadow-card transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;