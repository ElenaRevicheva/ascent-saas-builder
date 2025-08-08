
// PayPal Configuration for EspaLuz
export const PAYPAL_CONFIG = {
  // Your PayPal Client ID from PayPal Developer Dashboard
  clientId: 'AUpTsgq7TMjNOxaUj4UR09_keGV74GHAxO8Da8vqwuBBRmfG4mZ1JgDCPvKQs8BfB1u_q5NXwCELBKgi',
  
  // Your actual PayPal Merchant ID  
  merchantId: 'C3CGZX3P692W6',
  
  // PayPal Subscription Plan IDs (you'll create these in PayPal Dashboard)
  plans: {
    standard: {
      id: null, // You need to create this plan in PayPal Developer Dashboard first
      name: 'EspaLuz Standard',
      price: '$7.77/month'
    },
    premium: {
      id: null, // Set to null until premium plan is created
      name: 'EspaLuz Premium',
      price: 'Coming Soon'
    }
  },
  
  // Environment settings - use sandbox for testing
  environment: 'sandbox' // 'sandbox' or 'production'
};

export const getPayPalSDKUrl = () => {
  const env = PAYPAL_CONFIG.environment === 'production' ? '' : '.sandbox';
  return `https://www${env}.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.clientId}&vault=true&intent=subscription`;
};
