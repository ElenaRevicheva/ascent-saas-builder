import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, MessageSquare, Smartphone, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingConnectBotProps {
  onComplete: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export const OnboardingConnectBot = ({ onComplete, onNext, onPrevious, onSkip }: OnboardingConnectBotProps) => {
  const { user } = useAuth();
  const [connectionCode, setConnectionCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    checkConnectedBots();
  }, [user]);

  const checkConnectedBots = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('connected_bots')
        .select('platform')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      setConnectedPlatforms(data?.map(bot => bot.platform) || []);
    } catch (error) {
      console.error('Error checking connected bots:', error);
    }
  };

  const generateConnectionCode = async (platform: string) => {
    if (!user) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('connect-bot', {
        body: { platform }
      });

      if (error) throw error;

      setConnectionCode(data.code);
      toast.success(`Connection code generated for ${platform}`);
    } catch (error) {
      console.error('Error generating connection code:', error);
      toast.error('Failed to generate connection code');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = () => {
    if (connectionCode) {
      navigator.clipboard.writeText(connectionCode);
      toast.success('Code copied to clipboard!');
    }
  };

  const platforms = [
    {
      id: 'telegram',
      name: 'Telegram',
      description: 'Chat with your AI tutor on Telegram',
      benefits: ['Instant notifications', 'Voice messages', 'Group family chats'],
      connected: connectedPlatforms.includes('telegram')
    }
  ];

  const handleContinue = () => {
    onComplete();
    onNext();
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <Smartphone className="h-6 w-6 text-[hsl(var(--espaluz-primary))]" />
          Connect Your Preferred Platform
        </CardTitle>
        <CardDescription className="text-lg">
          Learn Spanish wherever you are! Connect Telegram or WhatsApp for instant access to your AI tutor.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-[hsl(var(--espaluz-primary))]/10 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-[hsl(var(--espaluz-primary))]">Why connect a platform?</h4>
          <ul className="text-sm space-y-1">
            <li>• Practice Spanish during your daily routine</li>
            <li>• Get instant help with translations and grammar</li>
            <li>• Receive learning reminders and motivation</li>
            <li>• Share progress with family members</li>
          </ul>
        </div>

        <div className="grid gap-4">
          {platforms.map((platform) => (
            <div key={platform.id} className="border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[hsl(var(--espaluz-primary))]/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-[hsl(var(--espaluz-primary))]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{platform.name}</h3>
                      {platform.connected && (
                        <Badge variant="default" className="bg-green-500 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{platform.description}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                {platform.benefits.map((benefit, index) => (
                  <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {benefit}
                  </div>
                ))}
              </div>

              {!platform.connected && (
                <Button
                  onClick={() => generateConnectionCode(platform.id)}
                  disabled={isGenerating}
                  variant="outline"
                  className="w-full"
                >
                  {isGenerating ? 'Generating...' : `Connect ${platform.name}`}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {connectionCode && (
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Your Connection Code</h4>
              <Button variant="outline" size="sm" onClick={copyCode}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </Button>
            </div>
            <div className="font-mono text-lg text-center p-3 bg-background rounded border">
              {connectionCode}
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Next steps:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open Telegram and search for @EspaLuzBot</li>
                <li>Start a chat and send the code above</li>
                <li>Your AI tutor will be ready to help you learn Spanish!</li>
              </ol>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
          Don't worry - you can always connect platforms later from your dashboard.
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
            <Button 
              onClick={handleContinue}
              className="bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] hover:opacity-90"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
};