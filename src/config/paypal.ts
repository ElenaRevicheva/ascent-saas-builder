// PayPal Configuration for EspaLuz
export const PAYPAL_CONFIG = {
  // Your PayPal Client ID from PayPal Developer Dashboard
  clientId: 'AUpTsgq7TMjNOxaUj4UR09_keGV74GHAxO8Da8vqwuBBRmfG4mZ1JgDCPvKQs8BfB1u_q5NXwCELBKgi',
  
  // Your actual PayPal Merchant ID
  merchantId: 'C3CGZX3P692W6',
  
  // PayPal Subscription Plan IDs (you'll create these in PayPal Dashboard)
  plans: {
    standard: {
      id: import.meta.env.VITE_PAYPAL_STANDARD_PLAN_ID || 'P-7XX77777XX777777X',
      name: 'EspaLuz Standard',
      price: '$7.77/month'
    },
    premium: {
      id: import.meta.env.VITE_PAYPAL_PREMIUM_PLAN_ID || 'P-8XX88888XX888888X',
      name: 'EspaLuz Premium',
      price: 'Coming Soon'
    }
  },
  
  // Environment settings
  environment: import.meta.env.VITE_PAYPAL_ENVIRONMENT || 'sandbox' // 'sandbox' or 'production'
};

export const getPayPalSDKUrl = () => {
  const env = PAYPAL_CONFIG.environment === 'production' ? '' : '.sandbox';
  return `https://www${env}.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.clientId}&vault=true&intent=subscription`;
};