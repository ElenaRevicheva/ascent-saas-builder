import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Share2, Copy, Users, Gift, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Referral {
  id: string;
  referral_code: string;
  converted_at: string | null;
  created_at: string;
}

export const ReferralSystem = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (user) {
      fetchReferrals();
      createInitialReferralCode();
    }
  }, [user]);

  const fetchReferrals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInitialReferralCode = async () => {
    if (!user) return;

    try {
      // Check if user already has a referral code
      const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_user_id', user.id)
        .limit(1);

      if (existing && existing.length > 0) return;

      // Create initial referral code
      const { data, error } = await supabase.rpc('generate_referral_code');
      if (error) throw error;

      const { error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_user_id: user.id,
          referral_code: data
        });

      if (insertError) throw insertError;
      fetchReferrals();
    } catch (error) {
      console.error('Error creating referral code:', error);
    }
  };

  const generateNewReferralCode = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('generate_referral_code');
      if (error) throw error;

      const { error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_user_id: user.id,
          referral_code: data
        });

      if (insertError) throw insertError;
      fetchReferrals();
      toast.success('New referral code generated!');
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast.error('Failed to generate referral code');
    }
  };

  const copyReferralLink = (code: string) => {
    const referralLink = `${window.location.origin}/auth?ref=${code}`;
    navigator.clipboard.writeText(referralLink);
    setCopySuccess(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const shareReferralLink = (code: string) => {
    const referralLink = `${window.location.origin}/auth?ref=${code}`;
    const text = `🌟 Join me on EspaLuz - the AI Spanish tutor that's helping families learn Spanish naturally! Use my referral link to get started: ${referralLink}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Learn Spanish with EspaLuz',
        text: text,
        url: referralLink,
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Referral message copied!');
    }
  };

  const primaryReferralCode = referrals[0]?.referral_code;
  const conversions = referrals.filter(r => r.converted_at).length;
  const pendingReferrals = referrals.filter(r => !r.converted_at).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Referral Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Refer Friends & Earn Rewards
          </CardTitle>
          <CardDescription>
            Share EspaLuz with friends and family. You both get 1 month free when they subscribe!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {primaryReferralCode && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/auth?ref=${primaryReferralCode}`}
                  className="font-mono text-sm"
                />
                <Button 
                  onClick={() => copyReferralLink(primaryReferralCode)}
                  variant="outline"
                  size="icon"
                >
                  {copySuccess ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button 
                  onClick={() => shareReferralLink(primaryReferralCode)}
                  variant="default"
                  size="icon"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{conversions}</div>
                  <div className="text-sm text-muted-foreground">Successful Referrals</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-orange-500">{pendingReferrals}</div>
                  <div className="text-sm text-muted-foreground">Pending Invites</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Need more referral codes?
            </div>
            <Button onClick={generateNewReferralCode} variant="outline" size="sm">
              Generate New Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      {referrals.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Referral Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="space-y-1">
                    <div className="font-mono text-sm">{referral.referral_code}</div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(referral.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {referral.converted_at ? (
                      <Badge variant="default">Converted</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyReferralLink(referral.referral_code)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Referrals Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-4 border rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">1</span>
              </div>
              <div className="font-medium mb-1">Share Your Link</div>
              <div className="text-muted-foreground">Send your referral link to friends and family</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">2</span>
              </div>
              <div className="font-medium mb-1">They Sign Up</div>
              <div className="text-muted-foreground">Your friend creates an account using your link</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">3</span>
              </div>
              <div className="font-medium mb-1">Both Get Rewards</div>
              <div className="text-muted-foreground">You both receive 1 month free when they subscribe</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};