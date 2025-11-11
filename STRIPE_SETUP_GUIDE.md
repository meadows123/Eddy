# Paystack Test Keys Setup Guide

## 🔑 Your Paystack Test Keys

```
Test Secret Key (Backend): sk_test_39b03dfb570b30ea869fe2ecabd2832b0053689f
Test Public Key (Frontend): pk_test_a020f7253c702c9cb520940e5a53e2d5f307f699
```

**Note**: For Stripe keys (when expanding to Europe), you'll need to get those from your Stripe Dashboard later.

## ⚙️ Setup Steps

### Step 1: Add to Supabase Secrets

1. Go to **Supabase Dashboard**
2. Select your project
3. Go to **Settings → Secrets**
4. Add the Paystack secret:

| Name | Value |
|------|-------|
| `PAYSTACK_SECRET_KEY` | `sk_test_39b03dfb570b30ea869fe2ecabd2832b0053689f` |
| `PAYSTACK_TEST_SECRET_KEY` | `sk_test_39b03dfb570b30ea869fe2ecabd2832b0053689f` |

### Step 2: Update Frontend Environment Variables

Create or update `.env.local` in project root:

```
# Paystack Test Keys
VITE_PAYSTACK_SECRET_KEY=sk_test_39b03dfb570b30ea869fe2ecabd2832b0053689f
VITE_PAYSTACK_PUBLISHABLE_KEY=pk_test_a020f7253c702c9cb520940e5a53e2d5f307f699

# Stripe Test Keys (add later when expanding to Europe)
# VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
# VITE_STRIPE_SECRET_KEY=sk_test_xxxxx

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 3: Verify Configuration

Run this in browser console:
```javascript
// Should return test key
import.meta.env.VITE_PAYSTACK_PUBLISHABLE_KEY
```

Should output: `pk_test_a020f7253c702c9cb520940e5a53e2d5f307f699`

### Step 4: Redeploy Edge Functions

After adding secrets, redeploy:
```bash
supabase functions deploy
```

## 🧪 Test Payment

### Paystack Test Flow

1. Go to checkout page
2. Select **NGN currency** (forces Paystack)
3. Proceed to checkout
4. Paystack will redirect you to their payment page
5. Use any test credentials (Paystack test mode doesn't validate)
6. Payment should complete successfully

### Future: Stripe Test Cards

When you get Stripe keys for Europe, use these test cards:

| Card Type | Number | CVC | Exp Date |
|-----------|--------|-----|----------|
| Visa | `4242 4242 4242 4242` | Any 3 digits | Any future date |
| Visa (Decline) | `4000 0000 0000 0002` | Any 3 digits | Any future date |
| Mastercard | `5555 5555 5555 4444` | Any 3 digits | Any future date |

Then test by:
1. Go to checkout page
2. Select **EUR currency** (forces Stripe)
3. Enter test card
4. Complete payment

## 🔄 How Payment Processor Selection Works

### For Paystack (Nigeria - NGN):
- Currency: **NGN**
- Uses: **Paystack processor** automatically
- Keys: `PAYSTACK_SECRET_KEY` (backend), `PAYSTACK_PUBLISHABLE_KEY` (frontend)
- Status: ✅ **Ready now with your test keys**

### For Stripe (Europe/Other - EUR/GBP/USD):
- Currency: **EUR, GBP, USD, CAD, AUD**
- Uses: **Stripe processor** automatically
- Keys: Need to get from Stripe Dashboard later
- Status: ⏳ **Ready when you get Stripe keys**

The payment processor is **automatically selected based on currency** - no manual switching needed!

## ⚠️ Important Notes

- **Never commit keys to git** - Use .env.local (in .gitignore)
- **Test mode only** - These are test keys, no real money charged
- **Different API versions** - Paystack and Stripe have different APIs
- **Both systems work together** - Single user can pay via Paystack or Stripe based on currency
- **Processor routing automatic** - No manual switching needed

## 🚀 Go Live (Later)

When ready for production:

1. Get live keys from Stripe Dashboard
2. Create new Supabase secrets: `STRIPE_SECRET_KEY` (live)
3. Update frontend: `VITE_STRIPE_PUBLISHABLE_KEY` (live)
4. Keep test keys for testing environment
5. Update `.env.production` with live keys

## 📋 Checklist

- [ ] Added secrets to Supabase
- [ ] Updated .env.local with keys
- [ ] Redeployed Edge Functions
- [ ] Verified keys in browser console
- [ ] Tested single payment (NGN - Paystack)
- [ ] Tested single payment (EUR - Stripe)
- [ ] Tested with test card 4242 4242 4242 4242
- [ ] Verified webhook handling
- [ ] Checked database for payment records

## 🆘 Troubleshooting

### "Missing value for Stripe(): apiKey should be a string"
**Fix**: Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set in .env.local

### "Stripe secret key not configured"
**Fix**: Verify `STRIPE_SECRET_KEY` is added to Supabase Secrets

### Payment fails with "Invalid API Key"
**Fix**: Make sure you're using test keys (start with `sk_test_` and `pk_test_`)

### Paystack payment still showing
**Fix**: Make sure venue currency is set to EUR/GBP/USD (not NGN)

## 📞 Support

- Stripe Docs: https://stripe.com/docs/testing
- Paystack Docs: https://paystack.com/docs/
- Our Processor: `src/lib/paymentProcessor/`

---

**Next Steps:**
1. ✅ Add keys to Supabase
2. ✅ Update .env.local
3. ✅ Deploy Edge Functions
4. ⏳ Test payment flow
5. ⏳ Verify database updates
6. ⏳ Check email notifications

