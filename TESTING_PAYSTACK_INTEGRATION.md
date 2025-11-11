# Testing Paystack Integration Guide

## ✅ Pre-Test Checklist

Before testing, verify these are complete:

- [x] Paystack test keys added to Supabase Secrets
- [x] Environment variables updated (.env.local and Render)
- [x] Edge Functions deployed (`supabase functions deploy`)
- [ ] Browser cache cleared (hard refresh: Ctrl+Shift+R)
- [ ] Console open (F12) to watch for errors
- [ ] Test venue created with NGN currency

---

## 🧪 Test Scenario 1: Single Payment (NGN)

### Setup
1. Create a test venue in your database with:
   - Currency: **NGN**
   - Paystack subaccount ID: Your Paystack test subaccount
   - Amount: **₦10,000**

### Test Steps
1. Go to **Checkout Page**
2. Select venue (should be NGN)
3. Verify you see:
   - ✅ Amount in Naira (₦)
   - ✅ Paystack selected as processor
   - ✅ "Pay ₦10,000" button

4. Click **"Proceed to Payment"**
5. Should redirect to **Paystack test payment page**
6. Complete payment (use any credentials in test mode)
7. Should redirect back to **success page**

### Expected Results
```
✅ Payment initiated successfully
✅ Paystack payment page appears
✅ Payment completes
✅ Booking marked as "confirmed"
✅ Customer receives confirmation email
✅ Venue owner receives notification
✅ Platform earnings recorded (10% of ₦10,000 = ₦1,000)
```

### Debugging
If it fails, check:
1. Browser console (F12) for errors
2. Network tab - check POST to `/functions/v1/create-split-payment-intent`
3. Supabase Edge Function logs
4. Check environment variables are set correctly

```javascript
// In browser console, verify:
import.meta.env.VITE_PAYSTACK_PUBLISHABLE_KEY
// Should return: pk_test_a020f7253c702c9cb520940e5a53e2d5f307f699
```

---

## 🧪 Test Scenario 2: Split Payment (Multiple Venues - NGN)

### Setup
1. Create 2 test venues with NGN currency:
   - Venue A: 50% split
   - Venue B: 50% split
   - Total amount: **₦20,000**

### Test Steps
1. Go to **Split Payment Page**
2. Select both venues (50% each)
3. Enter **₦20,000**
4. Click **"Proceed to Payment"**
5. Should redirect to Paystack
6. Complete payment

### Expected Results
```
✅ Both venues receive payment:
   Platform: ₦2,000 (10%)
   Venue A: ₦9,000 (45%)
   Venue B: ₦9,000 (45%)

✅ Emails sent to:
   - Customer (confirmation)
   - Venue A (booking notification)
   - Venue B (booking notification)

✅ Database records created:
   - booking (single record)
   - paystack_split (split details)
   - platform_earnings (₦2,000)
```

---

## 🧪 Test Scenario 3: Payment with Credits

### Setup
1. Add **100 credits** to test customer account
2. Create booking: **₦10,000**
3. Use **50 credits** (₦50 value)

### Test Steps
1. Go to **Checkout Page**
2. Select **Use 50 Credits**
3. Verify amount updates to: **₦9,950** (₦10,000 - ₦50)
4. Click **"Proceed to Payment"**
5. Complete Paystack payment

### Expected Results
```
✅ Payment amount reduced by credits
✅ Customer charged only ₦9,950
✅ 50 credits deducted from account
✅ New balance: 50 credits

✅ Platform earnings:
   Platform fee: ₦995 (10% of ₦9,950)
   
✅ Database records:
   - booking (with credits_used: 50)
   - credit_transaction (usage record)
```

---

## 📊 Test Scenario 4: Full Credit Coverage

### Setup
1. Customer has **₦10,000 worth** of credits (10,000 credits)
2. Booking: **₦10,000**
3. Use **all 10,000 credits**

### Test Steps
1. Go to **Checkout Page**
2. Use all credits
3. Verify amount shows: **₦0** (fully covered)
4. Click **"Confirm Booking"**

### Expected Results
```
✅ NO Paystack payment required
✅ Booking created immediately
✅ No redirect to Paystack
✅ Success message appears
✅ 10,000 credits deducted
✅ Customer receives confirmation email
```

---

## 🔍 What to Check in Database

After each test, verify in Supabase:

### Bookings Table
```sql
SELECT id, status, total_amount, payment_status, created_at
FROM bookings
ORDER BY created_at DESC
LIMIT 5;
```

Expected:
- ✅ `status` = 'confirmed'
- ✅ `payment_status` = 'paid'
- ✅ `total_amount` = correct amount

### Payment Records (if tracking in separate table)
```sql
SELECT id, booking_id, processor_type, amount, platform_fee, status
FROM payment_records
ORDER BY created_at DESC
LIMIT 5;
```

Expected:
- ✅ `processor_type` = 'paystack'
- ✅ `status` = 'completed'
- ✅ `platform_fee` = amount * 0.10

### Credit Transactions
```sql
SELECT id, user_id, booking_id, credits_used, transaction_type
FROM credit_transactions
ORDER BY created_at DESC
LIMIT 5;
```

Expected:
- ✅ `transaction_type` = 'usage'
- ✅ `credits_used` = amount used

---

## 📧 Email Notifications

### Emails That Should Be Sent

For each successful payment:

#### 1. Customer Confirmation Email
- **To**: Customer email
- **Contains**:
  - ✅ Booking reference
  - ✅ Booking date/time
  - ✅ Total amount
  - ✅ Table information
  - ✅ QR code for entry
  - ✅ Venue details

#### 2. Venue Owner Notification(s)
- **To**: Each venue owner's email
- **Contains**:
  - ✅ New booking notification
  - ✅ Customer info
  - ✅ Amount received
  - ✅ Booking details
  - ✅ Action required (prepare table, etc.)

### Check Email Logs
In Supabase Edge Function logs:
```
Look for: "Email sent successfully"
Check: Recipient email, template used, timestamp
```

---

## 🔧 Common Issues & Solutions

### Issue: "Paystack not initialized"
**Solution**: 
- Verify `VITE_PAYSTACK_PUBLISHABLE_KEY` is set
- Clear cache: Ctrl+Shift+R
- Check console for actual error message

### Issue: "Payment amount is 0"
**Solution**:
- Verify `calculateTotal()` function returns correct value
- Check currency is NGN
- Ensure venue amount is set correctly

### Issue: "Redirect not happening"
**Solution**:
- Check browser console for JavaScript errors
- Verify response from Edge Function has `authorizationUrl`
- Check network tab for failed requests

### Issue: "Webhook not received"
**Solution**:
- Verify webhook URL is set in Paystack Dashboard
- Check Supabase Edge Function logs
- Ensure Paystack signature verification passes

### Issue: "Credits not deducted"
**Solution**:
- Verify webhook processed successfully
- Check `credit_transactions` table for usage record
- Verify `profiles.credits_balance` updated

---

## ✅ Full Test Completion Checklist

### Payments
- [ ] Single payment (NGN) works
- [ ] Split payment (2 venues) works
- [ ] Payment with partial credits works
- [ ] Payment fully covered by credits works
- [ ] Booking created in database
- [ ] Payment status is "paid" or "completed"

### Emails
- [ ] Customer receives confirmation
- [ ] Venue owner receives notification
- [ ] Emails contain correct amounts
- [ ] QR code appears in emails
- [ ] Branding is correct (Eddy/Eddy Members)

### Database
- [ ] Booking record created
- [ ] Credit transactions recorded (if used)
- [ ] Payment records tracked
- [ ] Platform earnings logged
- [ ] All timestamps correct

### Edge Functions
- [ ] Payment initialization succeeds
- [ ] Webhook received and processed
- [ ] Email sending succeeds
- [ ] No errors in logs

---

## 🚀 If All Tests Pass

You're ready for:
1. ✅ **Split Payment Integration** - next phase
2. ✅ **Webhook Handler Creation** - for production
3. ✅ **European Expansion** - when you get Stripe keys

---

## 📞 Debug Commands

### Check Paystack Status
```javascript
// In browser console
const processor = PaymentProcessorFactory.getProcessor('NGN');
console.log(processor.getDisplayName()); // Should be "Paystack"
```

### Monitor Edge Function
```bash
# In terminal
supabase functions delete create-split-payment-intent
supabase functions deploy create-split-payment-intent
# Check logs for real-time debugging
```

### View Paystack Test Dashboard
https://dashboard.paystack.com/transactions

---

## 📋 Test Results Log

| Test | Status | Notes | Date |
|------|--------|-------|------|
| Single Payment | [ ] Pass [ ] Fail | | |
| Split Payment | [ ] Pass [ ] Fail | | |
| With Credits | [ ] Pass [ ] Fail | | |
| Full Credit Coverage | [ ] Pass [ ] Fail | | |
| Customer Email | [ ] Pass [ ] Fail | | |
| Venue Email | [ ] Pass [ ] Fail | | |
| Database Records | [ ] Pass [ ] Fail | | |

---

**Ready to test?** Start with Test Scenario 1! 🧪

