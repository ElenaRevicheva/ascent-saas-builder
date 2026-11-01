
// PayPal Configuration for EspaLuz
export const PAYPAL_CONFIG = {
  // Your PayPal Client ID from PayPal Developer Dashboard
  clientId: 'AUyb8OH20DHNmEWHSW4SSsNPPbuJ4NKQW-feaiEF9Hlk8s5xlQUHJ2qJbVwd-y4StyD_o70Zba5DSotz',
  
  // Your actual PayPal Merchant ID  
  merchantId: 'C3CGZX3P692W6',
  
  // PayPal Subscription Plan IDs (you'll create these in PayPal Dashboard)
  plans: {
    standard: {
      // 1 Nov 2026 (Elena): ONE price on every channel - $11/month, first PayPal charge 2 weeks after subscribing.
      // Families already on the $7.77 plan (P-38A73508FY163121MNCJXTYY) keep it; the payment truth reads both.
      id: 'P-6GR95409C95293139NFSBJJY',
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
