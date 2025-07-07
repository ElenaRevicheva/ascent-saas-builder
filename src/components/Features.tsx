import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Rocket, 
  Users, 
  BarChart3, 
  Lock, 
  Zap, 
  Globe,
  Smartphone,
  Cloud,
  Headphones
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Rocket,
      title: "Rapid Deployment",
      description: "Launch your SaaS in days, not months. Pre-built components and infrastructure ready to go."
    },
    {
      icon: Users,
      title: "User Management",
      description: "Complete authentication system with role-based access control and user profiles."
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Real-time insights and metrics to track your business performance and user engagement."
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Bank-level security with encryption, compliance certifications, and audit logs."
    },
    {
      icon: Zap,
      title: "High Performance",
      description: "Built on modern architecture for lightning-fast load times and smooth user experience."
    },
    {
      icon: Globe,
      title: "Global Scale",
      description: "CDN-powered infrastructure that scales automatically to serve users worldwide."
    },
    {
      icon: Smartphone,
      title: "Mobile Responsive",
      description: "Perfect experience across all devices with progressive web app capabilities."
    },
    {
      icon: Cloud,
      title: "Cloud Native",
      description: "Serverless architecture that scales with your business and reduces operational overhead."
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Expert support team available around the clock to help you succeed."
    }
  ];

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Everything You Need to
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Succeed</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive features designed to accelerate your SaaS development 
            and ensure your business scales smoothly.
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