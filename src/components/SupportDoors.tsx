import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { loadHubSpotChat, HUBSPOT_CHAT_ON } from '@/lib/hubspotChat';

/*
 * 21 Nov 2026 (Elena: families need a visible door for help and premium requests - landing, dashboard, everywhere):
 * the WhatsApp bubble (a person, Elena's business number) on every page, and HubSpot's chat on the website after cookie
 * consent (hubspotChat.ts). Not on the kids' classrooms: a child should not tap into a chat with a stranger, and the
 * classroom screen is the child's. The admin page does not need it either.
 */
const HIDDEN = ['/classroom', '/classroom-ru', '/admin'];

export default function SupportDoors() {
  const { pathname } = useLocation();
  // 21 Nov 2026 (Elena): "for now, wire the WhatsApp bubble" - HubSpot chat is OFF on EspaLuz until its own EspaLuz chatflow
  // is live and she wants a second inbox. To switch it on: set HUBSPOT_CHAT_ON = true (hubspotChat.ts keeps consent + live-site + no-Play rules).
  useEffect(() => { if (HUBSPOT_CHAT_ON) loadHubSpotChat(); }, []);
  if (HIDDEN.includes(pathname)) return null;
  return <WhatsAppFloat />;
}
