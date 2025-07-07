import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, MessageSquare, BarChart3, Users, Trophy, Globe, Bot, BookOpen } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Dashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [telegramCode, setTelegramCode] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      // Get user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      
      setProfile(profileData);

      // Get recent learning sessions
      const { data: sessions } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (sessions) {
        setChatMessages(sessions);
      }
      
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate("/auth");
      }
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      // Create a learning session
      const { error } = await supabase
        .from("learning_sessions")
        .insert({
          user_id: user.id,
          session_type: "web_chat",
          source: "dashboard",
          content: { message: newMessage, response: "¡Hola! I'm your Spanish tutor. Let's practice!" },
          progress_data: { vocabulary_count: 1, lesson_type: "conversation" }
        });

      if (error) throw error;

      // Add to chat display
      setChatMessages(prev => [{
        content: { message: newMessage, response: "¡Hola! I'm your Spanish tutor. Let's practice!" },
        created_at: new Date().toISOString()
      }, ...prev]);

      setNewMessage("");
      
      toast({
        title: "¡Excelente!",
        description: "Your message has been sent to your Spanish tutor."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateTelegramCode = async () => {
    if (!user) return;

    try {
      // Generate connection code
      const { data: codeData, error } = await supabase
        .from("bot_connection_codes")
        .insert({
          user_id: user.id,
          platform: "telegram",
          code: Math.random().toString(36).substring(2, 8).toUpperCase(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setTelegramCode(codeData.code);
      
      toast({
        title: "Código Generado",
        description: `Envía el código ${codeData.code} a @EspaLuzFamily_bot en Telegram`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el código de conexión",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tu clase de español...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Learning Streak",
      value: "7 días",
      change: "+2 days",
      icon: Trophy,
      color: "text-yellow-600"
    },
    {
      title: "Vocabulary Learned",
      value: "142",
      change: "+12 words",
      icon: BookOpen,
      color: "text-green-600"
    },
    {
      title: "Conversations",
      value: "23",
      change: "+3 today",
      icon: MessageSquare,
      color: "text-blue-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            🇪🇸 Tu Clase de Español
          </h1>
          
          <div className="flex items-center space-x-4">
            <span className="text-muted-foreground">
              ¡Hola, {profile?.full_name || user?.email}!
            </span>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            ¡Bienvenido a tu Dashboard de Español!
          </h2>
          <p className="text-muted-foreground">
            Nivel: {profile?.learning_level || "Principiante"} • Continúa tu práctica diaria
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="border-border shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{stat.change}</span> from yesterday
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Chat con tu Tutor AI
              </CardTitle>
              <CardDescription>
                Practica español conversando con tu tutor personalizado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-64 overflow-y-auto bg-muted/30 rounded-lg p-4 space-y-3">
                {chatMessages.map((message, index) => (
                  <div key={index} className="space-y-2">
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg ml-auto max-w-xs">
                      {message.content?.message}
                    </div>
                    <div className="bg-secondary text-secondary-foreground p-2 rounded-lg mr-auto max-w-xs">
                      {message.content?.response}
                    </div>
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <p className="text-muted-foreground text-center">
                    ¡Escribe tu primer mensaje para empezar a practicar!
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Escribe en español..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage} variant="hero">
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Tu Progreso
              </CardTitle>
              <CardDescription>
                Resumen de tu aprendizaje de español
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nivel Actual</label>
                  <p className="text-foreground text-lg">{profile?.learning_level || "Principiante"}</p>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lecciones Completadas</span>
                  <span className="font-medium">{chatMessages.length}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiempo Total</span>
                  <span className="font-medium">2.5 horas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Próxima Meta</span>
                  <span className="font-medium text-primary">50 palabras nuevas</span>
                </div>
                <div className="space-y-2">
                  <Button 
                    variant="hero" 
                    className="w-full"
                    onClick={generateTelegramCode}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Conectar Telegram
                  </Button>
                  {telegramCode && (
                    <div className="text-sm text-center p-2 bg-primary/10 rounded">
                      <p className="font-medium">Código: {telegramCode}</p>
                      <p className="text-xs text-muted-foreground">
                        Envía este código a @EspaLuzFamily_bot
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;