# Stripe Connected Accounts Setup Guide

## Overview

This guide explains how to set up and integrate Stripe Connected Accounts into the Eddy Members platform. Connected accounts allow venue owners to directly process payments to their own Stripe accounts instead of going through a platform account.

## Database Changes Required

### 1. Update `venue_owners` table

Add two new columns to store Stripe connection information:

```sql
ALTER TABLE venue_owners ADD COLUMN stripe_connected_account_id VARCHAR(255);
ALTER TABLE venue_owners ADD COLUMN stripe_access_token TEXT;
```

**OR** if the columns already exist, ensure they're nullable:

```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name='venue_owners' AND column_name IN ('stripe_connected_account_id', 'stripe_access_token');
```

## Environment Variables Required

Add these to your Supabase environment variables:

```
STRIPE_CLIENT_ID=your_stripe_client_id
STRIPE_SECRET_KEY=sk_live_xxxxx  # Live secret key
STRIPE_TEST_SECRET_KEY=sk_test_xxxxx  # Test secret key
```

You can find your `STRIPE_CLIENT_ID` in the Stripe Dashboard:
1. Go to Settings → Connected Accounts
2. Copy your "Client ID"

## How It Works

### 1. User Flow

1. **Venue Owner** clicks "Stripe Setup" button on their dashboard
2. **Frontend** redirects to `https://connect.stripe.com/oauth/authorize` with:
   - `client_id` (your platform's Stripe Client ID)
   - `redirect_uri` (pointing back to `/venue-owner/stripe-setup`)
   - `scope` (read_write)
   - `state` (for security verification)

3. **Venue Owner** logs into/creates their Stripe account
4. **Stripe** redirects back to your app with `code` and `state`
5. **Frontend** calls `stripe-oauth-callback` Edge Function with the code
6. **Edge Function** exchanges the code for the venue owner's Stripe user ID
7. **Database** stores the `stripe_connected_account_id` in `venue_owners` table
8. **Frontend** shows success message with connection status

### 2. Disconnecting

Venue owners can click "Disconnect Account" to remove their Stripe connection:
- Clears `stripe_connected_account_id` from database
- Payments will default to platform account until reconnected

## Files Created

### Frontend Files

1. **`src/pages/venue-owner/VenueOwnerStripeSetup.jsx`**
   - New page for managing Stripe connection
   - Handles OAuth flow
   - Shows connection status
   - Allows disconnection
   - Located at `/venue-owner/stripe-setup`

### Backend Files

1. **`supabase/functions/stripe-oauth-callback/index.ts`**
   - Handles OAuth code exchange
   - Stores connected account ID in database
   - Verifies user authentication
   - Returns success/error response

### Updated Files

1. **`src/App.jsx`**
   - Added import for `VenueOwnerStripeSetup`
   - Added route `/venue-owner/stripe-setup`

2. **`src/pages/venue-owner/VenueOwnerDashboard.jsx`**
   - Added "Stripe Setup" button in action buttons
   - Added `Zap` icon import

## Deployment Steps

### Step 1: Deploy Supabase Edge Function

```bash
supabase functions deploy stripe-oauth-callback
```

Or through the Supabase Dashboard:
1. Go to Edge Functions
2. Create new function named `stripe-oauth-callback`
3. Copy the code from `supabase/functions/stripe-oauth-callback/index.ts`

### Step 2: Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add columns to venue_owners table if they don't exist
ALTER TABLE venue_owners
ADD COLUMN IF NOT EXISTS stripe_connected_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_access_token TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_venue_owners_stripe_connected_id 
ON venue_owners(stripe_connected_account_id);
```

### Step 3: Environment Variables

Set these in your Supabase project settings:

```
STRIPE_CLIENT_ID=acct_xxxxxxxxxxxx  (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_TEST_SECRET_KEY=sk_test_xxxxxxxxxxxx
```

### Step 4: Deploy Frontend

Deploy your React app with the new files:
- `src/pages/venue-owner/VenueOwnerStripeSetup.jsx`
- Updated `src/App.jsx`
- Updated `src/pages/venue-owner/VenueOwnerDashboard.jsx`

## Testing

### Test in Development

1. Navigate to `/venue-owner/stripe-setup`
2. Click "Connect Stripe Account"
3. Log in with test Stripe account
4. Authorize the connection
5. Should be redirected back with success message
6. Check database to verify `stripe_connected_account_id` is stored

### Test Modes

- **Test Mode**: Use `sk_test_*` and connect with test Stripe account
- **Live Mode**: Use `sk_live_*` and connect with live Stripe account

## Next Steps: Using Connected Accounts for Payments

After setting up the connection, you'll need to update the payment processing:

1. **Update `create-split-payment-intent` Edge Function** to:
   - Check if venue owner has a connected account
   - If yes: Create payment intent with `on_behalf_of` parameter pointing to connected account
   - If no: Use platform account (existing behavior)

2. **Update payment confirmation** to:
   - Apply platform fees if using venue owner's connected account
   - Distribute funds accordingly

3. **Update email templates** to:
   - Show which account processed the payment
   - Include account details for fund tracking

### Example Payment Intent with Connected Account

```javascript
stripe.paymentIntents.create({
  amount: 100000, // in cents
  currency: 'ngn',
  payment_method: paymentMethodId,
  confirmation_method: 'manual',
  on_behalf_of: connectedAccountId, // Venue owner's Stripe user ID
  transfer_data: {
    destination: connectedAccountId // Where the funds go
  }
});
```

## Security Considerations

1. **State Parameter**: Used to prevent CSRF attacks (currently basic implementation)
2. **Authorization Header**: Verified to ensure user is authenticated
3. **Token Storage**: Access tokens stored securely in database
4. **HTTPS Only**: OAuth redirects must use HTTPS (enforced by Stripe)

## Troubleshooting

### Issue: "STRIPE_CLIENT_ID not configured"
- Solution: Add `STRIPE_CLIENT_ID` to Supabase environment variables

### Issue: "No Stripe user ID in token response"
- Solution: Verify Stripe Client ID is correct in OAuth request

### Issue: "Could not verify user from token"
- Solution: Ensure Authorization header is properly passed from frontend

### Issue: Token exchange fails with 401/403
- Solution: Verify Stripe Secret Key is correct and matches Client ID

## References

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe OAuth Documentation](https://stripe.com/docs/connect/oauth)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Testing Mode](https://stripe.com/docs/testing)

