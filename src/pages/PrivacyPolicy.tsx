import React from "react";

// 7 Nov 2026 (Google Play path, stage A): rewritten so it says only what EspaLuz really does. The July 2025 text claimed
// data "may be used to improve our AI models" (nothing is trained), "regular security audits" and marketing cookies
// (none exist), and never named the AI services that read messages. Google Play's Data safety form asks for exactly these.
const PrivacyPolicy = () => (
  <div className="min-h-screen flex flex-col items-center justify-start pt-16 pb-24 bg-gradient-to-br from-pink-50 via-blue-50 to-yellow-50 dark:from-[#1a1a2e] dark:via-[#16213e] dark:to-[#0f3460]">
    <div className="w-full max-w-3xl bg-white/90 dark:bg-card shadow-2xl rounded-3xl p-8 md:p-12 border-2 border-pink-200 dark:border-blue-900 relative overflow-hidden">
      <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-br from-pink-200 via-yellow-200 to-blue-200 rounded-full opacity-30 blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-tr from-blue-200 via-pink-200 to-yellow-200 rounded-full opacity-30 blur-2xl pointer-events-none"></div>
      <h1 className="text-4xl md:text-5xl font-extrabold text-center text-primary mb-2 tracking-tight drop-shadow-lg">Privacy Policy</h1>
      <p className="text-center text-muted-foreground mb-8 text-sm font-medium">Last updated: November 7, 2026</p>
      <div className="prose prose-base md:prose-lg max-w-none text-foreground">
        <p>
          EspaLuz is an AI companion that helps families live in Spanish and English: a chat on the web, on WhatsApp and on
          Telegram, with voice, and Pere and Titi's classroom for children. EspaLuz is an AI, not a person. It is run by
          Elena Revicheva (AIdeazz), Panama. This page says plainly what we keep, why, and who else sees it.
        </p>

        <h2 className="terms-section-title">1. What we keep</h2>
        <ul>
          <li><strong>Your account:</strong> your email address and sign-in details.</li>
          <li><strong>Your conversations</strong> with EspaLuz (web, WhatsApp, Telegram), so she can continue where you left off.</li>
          <li><strong>A small family notebook:</strong> short notes EspaLuz writes from what you tell her, such as family names,
            a child's age or school, pets, or an upcoming appointment. We tell the AI never to keep passwords, ID or card numbers,
            phone numbers, emails, street addresses, or health details beyond "has a doctor's appointment".</li>
          <li><strong>Voice notes:</strong> a voice note you send is turned into text; we keep the text.</li>
          <li><strong>The classroom:</strong> what the child says or draws in a lesson, so the next lesson continues from there
            and the parent can get a short report.</li>
          <li><strong>On WhatsApp and Telegram:</strong> your phone number or Telegram account ID, and WhatsApp's user ID for
            you, so we know it is the same family.</li>
          <li><strong>Payments:</strong> whether your subscription is active. Card or bank details stay with the payment
            company (PayPal, PagueloFacil or Gumroad); we never see them.</li>
          <li><strong>Reports:</strong> when you tap "Report", the text of that reply, with nothing about you.</li>
        </ul>
        <p>The free chat on the website without an account is <strong>not saved</strong>.</p>

        <h2 className="terms-section-title">2. Why we keep it</h2>
        <ul>
          <li>To answer you, remember your family, and continue lessons where they stopped.</li>
          <li>To run your subscription.</li>
          <li>To fix problems and keep the service safe.</li>
        </ul>
        <p>We do <strong>not</strong> sell your data, show advertising inside EspaLuz, or use your conversations to train AI models.</p>

        <h2 className="terms-section-title">3. Who else processes it</h2>
        <p>To work, EspaLuz sends what you write or say to these services. Each one only processes it to give you an answer:</p>
        <ul>
          <li><strong>AI models that write the replies and voices:</strong> Google (Gemini), Groq, xAI (Grok), OpenAI and Anthropic (Claude); Replicate for Pere and Titi's voices.</li>
          <li><strong>Speech to text:</strong> Groq and OpenAI (Whisper).</li>
          <li><strong>Video of EspaLuz speaking:</strong> Runway, for paying families.</li>
          <li><strong>Messaging:</strong> WhatsApp (Meta), through Twilio, and Telegram.</li>
          <li><strong>Hosting and storage:</strong> Supabase, Oracle Cloud and Lovable.</li>
          <li><strong>Payments:</strong> PayPal, PagueloFacil and Gumroad.</li>
          <li><strong>Visit counting:</strong> Google Analytics on app.espaluz.lat counts page visits and taps on buttons
            (for example, a first chat message or the WhatsApp button), so we can see where people get stuck. It receives
            page addresses and event names only, never what you write or say, and it is switched off in the kids classroom.
            Advertising features are turned off.</li>
        </ul>
        <p>We also share information if the law requires it.</p>

        <h2 className="terms-section-title">4. Children</h2>
        <ul>
          <li>The classroom opens only after a grown-up signs in. A child does not create an account.</li>
          <li>Before the first lesson, the parent ticks "I am this child's parent or guardian and I agree"; we keep the date of that agreement.</li>
          <li>We keep only what the lesson needs: what the child said or drew, and how the lesson went.</li>
          <li>A child's own words are shown only to their parent (in the report), never to other users.</li>
          <li>There is no advertising and no advertising ID in EspaLuz.</li>
          <li>A parent can ask us at any time to see or delete what we keep about their child.</li>
        </ul>

        <h2 className="terms-section-title">5. How long we keep it, and how to delete it</h2>
        <p>
          We keep your data while your account is active. To delete your account and everything we keep about your family,
          email <strong>aipa@aideazz.xyz</strong> with the subject <strong>"Delete my data"</strong> from the email of your
          account (if you use only WhatsApp or Telegram, tell us your number or Telegram name in the email). We delete it
          within 30 days and tell you when it is done.
        </p>

        <h2 className="terms-section-title">6. Security</h2>
        <p>
          Data travels encrypted (HTTPS) and is stored with the providers above. Access is limited to what the service needs.
          No system is perfectly secure; if something goes wrong that affects you, we will tell you.
        </p>

        <h2 className="terms-section-title">7. Cookies and local storage</h2>
        <p>
          We use what the app needs to work (keeping you signed in, small settings in your browser) and the Google Analytics
          cookie that counts visits, described in section 3. No advertising cookies. The kids classroom does not load it.
        </p>

        <h2 className="terms-section-title">8. Changes</h2>
        <p>If this policy changes, we update this page and the date at the top.</p>

        <h2 className="terms-section-title">9. Contact</h2>
        <p><strong>Email:</strong> aipa@aideazz.xyz<br/><strong>Subject line:</strong> Privacy</p>
        <hr />
        <p className="text-sm text-muted-foreground">
          <strong>En español, en breve:</strong> EspaLuz es una IA. Guardamos tu cuenta, tus conversaciones, notas cortas de
          tu familia y lo que tu peque hace en la clase, para seguir donde lo dejaron. No vendemos tus datos, no hay anuncios y
          no entrenamos modelos con tus conversaciones. Google Analytics cuenta visitas y botones (nunca lo que escribes ni
          lo que dices) y está apagado en la clase de los peques. Los servicios de IA, mensajería, alojamiento y pago listados arriba
          procesan lo necesario para responderte. Para borrar todo, escribe a aipa@aideazz.xyz con el asunto "Borrar mis datos".
        </p>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
