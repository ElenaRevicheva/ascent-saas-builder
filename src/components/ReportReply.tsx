import { useState } from 'react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

/**
 * 7 Nov 2026 (Google Play path, stage A): Play's AI-Generated Content policy asks for an in-app way to report a reply,
 * and families deserve one anyway. One tap saves the reply into `feedback` (anyone may insert, nobody may read it
 * through the API: read policy is `false`). Nothing about the user is attached.
 */
export function ReportReply({ text, where }: { text: string; where: 'chat' | 'classroom' }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const report = async () => {
    if (state !== 'idle') return;
    setState('sending');
    const excerpt = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 1800) || '(empty reply)';
    const { error } = await supabase.from('feedback').insert({ message: `[REPORT ${where}] ${excerpt}` });
    if (error) {
      setState('idle');
      toast.error('No se pudo enviar. Inténtalo otra vez. / Could not send. Please try again.');
      return;
    }
    setState('sent');
    toast.success('Gracias, lo revisaremos. / Thank you, we will review it.');
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={report}
      disabled={state !== 'idle'}
      className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600"
      aria-label="Report this reply / Reportar esta respuesta"
    >
      <Flag className="h-3 w-3 mr-1" />
      {state === 'sent' ? 'Reportado / Reported' : 'Reportar / Report'}
    </Button>
  );
}
