import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import { useReferralTracking } from './hooks/useReferralTracking'
import './index.css'
import './lib/i18n.ts'
import { registerRoadWorker } from './lib/carMode'

registerRoadWorker(); // 13 Nov 2026: car mode - the app opens with no signal (public/sw.js)

function AppWithReferralTracking() {
  useReferralTracking();
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <AppWithReferralTracking />
    </AuthProvider>
  </BrowserRouter>
);
