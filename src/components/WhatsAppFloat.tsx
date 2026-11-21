import { useState } from 'react';
import { MessageCircle, X, Send, CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { track } from '@/lib/track';

/*
 * 21 Nov 2026 (Elena: "a WhatsApp bubble everywhere in the UI, like on my /api website"): the SAME component as the
 * aideazz site (aideazz/src/components/WhatsAppFloat.tsx) - human support on Elena's WhatsApp Business number, time-aware
 * (Panama hours: "Online", after hours a booking link instead), bottom-LEFT so HubSpot's chat (bottom-right) never covers it.
 * Only change: EspaLuz has no framer-motion, so the open/close and the wiggle are plain CSS. It is a wa.me link: no API,
 * no tracking cookie, safe inside the Play app. NOTE: @espaluz on WhatsApp is the AI; this number is a person.
 */
type Props = { phone?: string; prefill?: string; bookingUrl?: string; timeZone?: string; openHour?: number; closeHour?: number; businessDays?: number[] };

function nowInZone(timeZone: string): { hour: number; day: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false, weekday: 'short' }).formatToParts(new Date());
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10) % 24;
    const wd = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { hour, day: map[wd] ?? new Date().getDay() };
  } catch {
    const d = new Date();
    return { hour: d.getHours(), day: d.getDay() };
  }
}

export const SUPPORT_WHATSAPP = '50761666716';
export const SUPPORT_EMAIL = 'aipa@aideazz.xyz';

export default function WhatsAppFloat({
  phone = SUPPORT_WHATSAPP, prefill, bookingUrl = 'https://calendly.com/elena_revicheva/coffee-chat',
  timeZone = 'America/Panama', openHour = 9, closeHour = 17, businessDays = [1, 2, 3, 4, 5, 6],
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { hour, day } = nowInZone(timeZone);
  const online = businessDays.includes(day) && hour >= openHour && hour <= closeHour;
  const chatUrl = `https://wa.me/${phone}?text=${encodeURIComponent(prefill ?? t('whatsappFloat.prefill'))}`;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">
      {open && (
        <div className="w-72 overflow-hidden rounded-2xl border border-green-400/30 bg-slate-900/95 shadow-2xl shadow-green-500/20 backdrop-blur animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 bg-green-600 px-4 py-3">
            <MessageCircle className="h-5 w-5 text-white" />
            <span className="font-semibold text-white">{t('whatsappFloat.header')}</span>
            <span className={`ml-auto flex items-center gap-1.5 text-xs font-medium ${online ? 'text-white' : 'text-green-100/80'}`}>
              <span className={`h-2 w-2 rounded-full ${online ? 'bg-green-300' : 'bg-amber-300'}`} />
              {online ? t('whatsappFloat.online') : t('whatsappFloat.away')}
            </span>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-white/80 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3 p-4">
            <div className="rounded-xl rounded-tl-none bg-white/10 px-3 py-2 text-sm text-gray-100">
              {online ? t('whatsappFloat.greetingOnline') : t('whatsappFloat.greetingAway')}
            </div>
            <a href={chatUrl} target="_blank" rel="noreferrer" onClick={() => track('contact_whatsapp', { placement: 'float', state: online ? 'online' : 'away' })}
              className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white shadow-lg shadow-green-500/40 hover:bg-green-500">
              {online ? t('whatsappFloat.openChat') : t('whatsappFloat.sendMessage')} <Send className="h-4 w-4" />
            </a>
            {!online && (
              <a href={bookingUrl} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-purple-400/40 bg-purple-600/20 px-4 py-3 font-semibold text-purple-100 hover:bg-purple-600/30">
                <CalendarClock className="h-4 w-4" /> {t('whatsappFloat.bookCall')}
              </a>
            )}
          </div>
        </div>
      )}
      <div className="relative flex h-14 w-14 items-center justify-center">
        {!open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-50" />}
        <button onClick={() => setOpen((v) => !v)} aria-label="Open WhatsApp chat"
          className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 shadow-lg shadow-green-500/50 transition-transform hover:scale-105 hover:bg-green-500 active:scale-95">
          {open ? <X className="h-6 w-6 text-white" /> : <MessageCircle className="h-7 w-7 text-white" />}
        </button>
      </div>
    </div>
  );
}
