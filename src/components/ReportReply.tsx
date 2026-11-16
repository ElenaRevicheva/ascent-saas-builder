import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

/**
 * 7 Nov 2026 (Google Play path, stage A): Play's AI-Generated Content policy asks for an in-app way to report a reply,
 * and families deserve one anyway. One tap saves the reply into `feedback` (anyone may insert, nobody may read it
 * through the API: read policy is `false`). Nothing about the user is attached.
 */
export function ReportReply({ text, where }: { text: string; where: 'chat' | 'classroom' }) {
  const { t } = useTranslation();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const report = async () => {
    if (state !== 'idle') return;
    setState('sending');
    const excerpt = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 1800) || '(empty reply)';
    const { error } = await supabase.from('feedback').insert({ message: `[REPORT ${where}] ${excerpt}` });
    if (error) {
      setState('idle');
      toast.error(t('misc.reportFailed'));
      return;
    }
    setState('sent');
    toast.success(t('misc.reportThanks'));
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={report}
      disabled={state !== 'idle'}
      className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600"
      aria-label={t('misc.reportAria')}
    >
      <Flag className="h-3 w-3 mr-1" />
      {state === 'sent' ? t('misc.reported') : t('misc.report')}
    </Button>
  );
}
