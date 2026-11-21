import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { loadHubSpotChat } from '@/lib/hubspotChat';

/*
 * 21 Nov 2026 (Elena: families need a visible door for help and premium requests - landing, dashboard, everywhere):
 * the WhatsApp bubble (a person, Elena's business number) on every page, and HubSpot's chat on the website after cookie
 * consent (hubspotChat.ts). Not on the kids' classrooms: a child should not tap into a chat with a stranger, and the
 * classroom screen is the child's. The admin page does not need it either.
 */
const HIDDEN = ['/classroom', '/classroom-ru', '/admin'];

export default function SupportDoors() {
  const { pathname } = useLocation();
  useEffect(() => { loadHubSpotChat(); }, []);
  if (HIDDEN.includes(pathname)) return null;
  return <WhatsAppFloat />;
}
