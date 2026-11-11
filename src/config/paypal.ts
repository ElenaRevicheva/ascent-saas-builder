
// PayPal Configuration for EspaLuz
export const PAYPAL_CONFIG = {
  // Your PayPal Client ID from PayPal Developer Dashboard
  clientId: 'AUyb8OH20DHNmEWHSW4SSsNPPbuJ4NKQW-feaiEF9Hlk8s5xlQUHJ2qJbVwd-y4StyD_o70Zba5DSotz',
  
  // Your actual PayPal Merchant ID  
  merchantId: 'C3CGZX3P692W6',
  
  // PayPal Subscription Plan IDs (you'll create these in PayPal Dashboard)
  plans: {
    standard: {
      // 11 Nov 2026 (Elena): ONE set of terms everywhere - 14 days free in the app (no card), then $11/month from the day
      // you subscribe (PayPal, PagueloFacil and Google Play alike). New PayPal plan has no trial of its own.
      // Families already on P-6GR95409C95293139NFSBJJY (2-week PayPal trial) or the $7.77 plan keep theirs.
      id: 'P-94X46784TP366873JNL2MWXA',
      name: 'EspaLuz Family',
      price: '$11/month'
    },
    premium: {
      id: null, // Set to null until premium plan is created
      name: 'EspaLuz Premium',
      price: 'Coming Soon'
    }
  },
  
  // Environment settings - NOW LIVE IN PRODUCTION
  environment: 'production' // 'sandbox' or 'production'
};

export const getPayPalSDKUrl = () => {
  const env = PAYPAL_CONFIG.environment === 'production' ? '' : '.sandbox';
  return `https://www${env}.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.clientId}&vault=true&intent=subscription&components=buttons`;
};
