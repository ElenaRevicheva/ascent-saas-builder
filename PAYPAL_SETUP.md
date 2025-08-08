# PayPal Business Setup Guide for EspaLuz

## 🎉 Congratulations on your Panama business registration!

Your PayPal integration is now ready for configuration. Follow these steps to complete the setup:

## ⚠️ IMPORTANT: Current Issue Resolution

**Issue**: PayPal subscription error "Something went wrong with your subscription"
**Solution**: The app is currently configured for **SANDBOX** testing. Make sure your PayPal plan exists in the sandbox environment.

### Quick Fix Steps:
1. **Environment Check**: App is now set to `sandbox` mode (was incorrectly set to `production`)
2. **Plan Verification**: Verify that plan ID `P-38A73508FY163121MNCJXTYY` exists in your PayPal **sandbox** account
3. **Test with Sandbox Account**: Use PayPal sandbox credentials for testing

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

## Step 2: Create Subscription Plans (CRITICAL)

**⚠️ IMPORTANT**: You need to create subscription plans in **BOTH** sandbox and production environments.

### Current Configuration:
- **Environment**: Sandbox (for testing)
- **Plan ID**: P-38A73508FY163121MNCJXTYY
- **Client ID**: AUyb8OH20DHNmEWHSW4SSsNPPbuJ4NKQW-feaiEF9Hlk8s5xlQUHJ2qJbVwd-y4StyD_o70Zba5DSotz

### Standard Plan ($7.77/month) - SANDBOX

1. Go to PayPal Developer Dashboard > **SANDBOX** > Products & Plans
2. Click "Create Plan"
3. Fill in:
   - **Product Name**: "EspaLuz Standard"
   - **Type**: "Service"
   - **Plan Name**: "EspaLuz Standard Monthly"
   - **Billing Cycle**: Monthly
   - **Price**: $7.77 USD
   - **Trial Period**: 1 week free (optional)
4. **IMPORTANT**: Copy the Plan ID and update it in the config if different from current one

### Standard Plan ($7.77/month) - PRODUCTION (When Ready)

Repeat the same process in the **LIVE** environment when ready to go live.

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

1. **Verify Plan Exists**: Log into https://sandbox.paypal.com with your business account
2. Go to **Products & Plans** and verify your subscription plan exists
3. Use PayPal Sandbox accounts for testing
4. Create test buyer accounts at: https://developer.paypal.com/developer/accounts/
5. Test the subscription flow thoroughly

## Step 5: Troubleshooting Common Issues

### "Something went wrong with your subscription" Error

**Possible Causes:**
1. **Plan doesn't exist in current environment** (most common)
2. **Wrong environment** (sandbox plan trying to work in production or vice versa)
3. **Invalid plan configuration**
4. **Network/CORS issues**

**Solutions:**
1. **Check Plan Existence**:
   - Log into your PayPal sandbox account
   - Go to Products & Plans
   - Verify plan ID `P-38A73508FY163121MNCJXTYY` exists
   
2. **Verify Environment Match**:
   - App is set to `sandbox` mode
   - Plan must exist in sandbox environment
   - Use sandbox PayPal credentials

3. **Check Browser Console**:
   - Open browser developer tools
   - Look for PayPal errors in console
   - Check network tab for failed requests

4. **Validate Configuration**:
   - Client ID matches sandbox app
   - Merchant ID is correct
   - Plan ID is from sandbox environment

### Plan Configuration Issues

If the plan doesn't exist or is misconfigured:

1. **Create New Plan**:
   ```bash
   # Use PayPal API or Dashboard to create plan
   # Make sure to use correct environment
   ```

2. **Update Plan ID in Config**:
   ```typescript
   // src/config/paypal.ts
   plans: {
     standard: {
       id: 'YOUR_NEW_PLAN_ID_HERE',
       name: 'EspaLuz Standard',
       price: '$7.77/month'
     }
   }
   ```

## Step 6: Go Live

When ready for production:

1. **Update Environment Variables**:
   ```bash
   VITE_PAYPAL_ENVIRONMENT=production
   ```

2. **Get Live Credentials**:
   - Switch to "Live" mode in PayPal Developer Dashboard
   - Copy your live Client ID
   - Create live subscription plans

3. **Update Configuration**:
   ```typescript
   // src/config/paypal.ts
   environment: 'production'
   ```

4. **Update Merchant ID**:
   - Get your actual merchant ID from PayPal Business account
   - Update `VITE_PAYPAL_MERCHANT_ID`

## Current Configuration Status

Your app is configured with:
- ✅ PayPal SDK integration
- ✅ Subscription handling
- ✅ Error handling and user feedback
- ✅ Standard plan integration in pricing section
- ✅ Sandbox mode for testing
- ⚠️ **REQUIRES**: Plan verification in sandbox environment

## Files Modified

- `src/components/PayPalButton.tsx` - Main PayPal integration (UPDATED)
- `src/config/paypal.ts` - Configuration management (UPDATED)
- `src/components/Pricing.tsx` - Updated to use PayPal button

## Next Steps (PRIORITY ORDER)

1. **IMMEDIATE**: Verify plan exists in PayPal sandbox
2. Set up your PayPal Developer account (if not done)
3. Create subscription plans in sandbox
4. Test in sandbox mode with debug information
5. Add environment variables (if using them)
6. Go live when ready!

## Debugging Information

The app now shows debugging information when in sandbox mode:
- Environment status
- Plan ID being used
- Merchant ID
- Helpful error messages

## Support Links

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal Subscriptions API](https://developer.paypal.com/docs/subscriptions/)
- [PayPal JavaScript SDK](https://developer.paypal.com/docs/checkout/reference/customize-sdk/)
- [PayPal Sandbox Testing](https://developer.paypal.com/docs/api-basics/sandbox/)

## Notes for Panama Business

- Ensure your PayPal Business account is set up for Panama
- Verify international payment processing is enabled
- Consider currency settings (USD recommended for international)
- Check compliance with Panama business regulations
- Make sure business verification is complete for live payments