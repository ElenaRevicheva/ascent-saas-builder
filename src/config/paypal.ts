// PayPal Configuration for EspaLuz
export const PAYPAL_CONFIG = {
  // Your PayPal Client ID from PayPal Developer Dashboard
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID',
  
  // Your actual PayPal Merchant ID
  merchantId: import.meta.env.VITE_PAYPAL_MERCHANT_ID || 'P8TXABNT28ZXG',
  
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