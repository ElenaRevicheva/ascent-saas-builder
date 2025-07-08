import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { 
  Bot, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  Clock,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ConnectionCode {
  id: string;
  code: string;
  platform: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface ConnectedBot {
  id: string;
  platform: string;
  platform_username: string | null;
  is_active: boolean;
  connected_at: string;
  last_activity: string | null;
}

const ConnectBot = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [connectionCode, setConnectionCode] = useState<ConnectionCode | null>(null);
  const [connectedBots, setConnectedBots] = useState<ConnectedBot[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingBots, setFetchingBots] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConnectedBots();
    }
  }, [user]);

  const fetchConnectedBots = async () => {
    try {
      const { data, error } = await supabase
        .from('connected_bots')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;
      setConnectedBots(data || []);
    } catch (error) {
      console.error('Error fetching connected bots:', error);
    } finally {
      setFetchingBots(false);
    }
  };

  const generateConnectionCode = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Call the database function to generate a connection code
      const { data, error } = await supabase.rpc('generate_connection_code');
      
      if (error) throw error;
      
      const generatedCode = data;
      
      // Insert the connection code into the database
      const { data: codeData, error: insertError } = await supabase
        .from('bot_connection_codes')
        .insert({
          user_id: user.id,
          code: generatedCode,
          platform: 'telegram',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      setConnectionCode(codeData);
      toast({
        title: t('connectBot.title'),
        description: t('connectBot.generateCode')
      });
    } catch (error) {
      console.error('Error generating connection code:', error);
      toast({
        title: "Error",
        description: "Failed to generate connection code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Connection code copied to clipboard."
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const isCodeExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header with Language Switcher */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('connectBot.backToDashboard')}
            </Link>
            <LanguageSwitcher variant="select" size="sm" />
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">{t('connectBot.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('connectBot.subtitle')}
            </p>
          </div>

          {/* Connected Bots */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                {t('connectBot.connectedBots')}
              </CardTitle>
              <CardDescription>
                {t('connectBot.connectedBotsSubtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fetchingBots ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  {t('connectBot.loadingBots')}
                </div>
              ) : connectedBots.length > 0 ? (
                <div className="space-y-3">
                  {connectedBots.map((bot) => (
                    <div key={bot.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium capitalize">{bot.platform}</p>
                          {bot.platform_username && (
                            <p className="text-sm text-muted-foreground">@{bot.platform_username}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {t('connectBot.connected')} {formatDate(bot.connected_at)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('connectBot.active')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No bots connected yet</p>
                  <p className="text-sm text-muted-foreground">Generate a connection code below to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connection Code Generation */}
          <Card>
            <CardHeader>
              <CardTitle>Connect Telegram Bot</CardTitle>
              <CardDescription>
                Generate a connection code to link your Telegram account with EspaLuz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionCode ? (
                <div className="space-y-4">
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Connection code expires in 10 minutes. Use it quickly!
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Your connection code:</p>
                        <p className="text-2xl font-mono font-bold text-primary">{connectionCode.code}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {formatDate(connectionCode.expires_at)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(connectionCode.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Alert>
                    <MessageSquare className="h-4 w-4" />
                    <AlertDescription>
                      Send this code to our Telegram bot <strong>@EspaLuzBot</strong> to complete the connection.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="p-6">
                    <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ready to Connect?</h3>
                    <p className="text-muted-foreground mb-4">
                      Generate a secure connection code to link your Telegram account with EspaLuz.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={generateConnectionCode} 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Generate Connection Code
                    </>
                  )}
                </Button>
                
                {connectionCode && (
                  <Button variant="outline" onClick={() => setConnectionCode(null)}>
                    Generate New
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConnectBot;