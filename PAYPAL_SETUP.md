# PayPal Business Setup Guide for EspaLuz

## 🎉 Congratulations on your Panama business registration!

Your PayPal integration is now ready for configuration. Follow these steps to complete the setup:

## Step 1: PayPal Developer Account Setup

1. **Go to PayPal Developer Dashboard**
   - Visit: https://developer.paypal.com/
   - Sign in with your PayPal Business account

2. **Create or Select Your App**
   - Click "Create App" if you don't have one
   - Choose "Default Application" or create a new one named "EspaLuz"
   - Select your business account

3. **Get Your Client ID**
   - Copy your "Client ID" from the app details
   - You'll need this for `VITE_PAYPAL_CLIENT_ID`

## Step 2: Create Subscription Plans

You need to create subscription plans in PayPal for your pricing tiers:

### Standard Plan ($7.77/month)
1. Go to PayPal Developer Dashboard > Products & Plans
2. Click "Create Plan"
3. Fill in:
   - **Product Name**: "EspaLuz Standard"
   - **Type**: "Service"
   - **Plan Name**: "EspaLuz Standard Monthly"
   - **Billing Cycle**: Monthly
   - **Price**: $7.77 USD
4. Copy the Plan ID (format: P-XXXXXXXXXXXXXXXXX)

### Premium Plan (Future)
- Create when ready to launch Premium tier

## Step 3: Environment Variables

Add these to your environment configuration:

```bash
# PayPal Configuration
VITE_PAYPAL_CLIENT_ID=your_client_id_here
VITE_PAYPAL_MERCHANT_ID=your_merchant_id_here
VITE_PAYPAL_STANDARD_PLAN_ID=your_standard_plan_id_here
VITE_PAYPAL_ENVIRONMENT=sandbox  # Change to 'production' when ready
```

## Step 4: Test in Sandbox Mode

1. Use PayPal Sandbox accounts for testing
2. Create test buyer accounts at: https://developer.paypal.com/developer/accounts/
3. Test the subscription flow thoroughly

## Step 5: Go Live

When ready for production:

1. **Update Environment Variables**:
   ```bash
   VITE_PAYPAL_ENVIRONMENT=production
   ```

2. **Get Live Credentials**:
   - Switch to "Live" mode in PayPal Developer Dashboard
   - Copy your live Client ID
   - Create live subscription plans

3. **Update Merchant ID**:
   - Get your actual merchant ID from PayPal Business account
   - Update `VITE_PAYPAL_MERCHANT_ID`

## Current Configuration

Your app is configured with:
- ✅ PayPal SDK integration
- ✅ Subscription handling
- ✅ Error handling and user feedback
- ✅ Standard plan integration in pricing section

## Files Modified

- `src/components/PayPalButton.tsx` - Main PayPal integration
- `src/config/paypal.ts` - Configuration management
- `src/components/Pricing.tsx` - Updated to use PayPal button

## Next Steps

1. Set up your PayPal Developer account
2. Create subscription plans
3. Add environment variables
4. Test in sandbox mode
5. Go live when ready!

## Support Links

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal Subscriptions API](https://developer.paypal.com/docs/subscriptions/)
- [PayPal JavaScript SDK](https://developer.paypal.com/docs/checkout/reference/customize-sdk/)

## Notes for Panama Business

- Ensure your PayPal Business account is set up for Panama
- Verify international payment processing is enabled
- Consider currency settings (USD recommended for international)
- Check compliance with Panama business regulations