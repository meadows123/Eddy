# Live Server Testing Guide (Render)

## 🚀 Testing on Your Live Render Server

Testing on your live Render deployment is **ideal** because:
- ✅ Webhooks work automatically
- ✅ All environment variables are already set
- ✅ Tests real-world scenario
- ✅ Confirms production readiness

---

## 🔧 Setup Paystack Webhook (ONE TIME)

### Step 1: Get Your Render App URL

Your app is running at:
```
https://your-app.onrender.com
```

(Replace with your actual Render URL)

### Step 2: Add Webhook to Paystack Dashboard

1. Go to **[Paystack Dashboard](https://dashboard.paystack.com)**
2. Navigate to **Settings** → **Webhooks**
3. Add webhook URL:
   ```
   https://your-app.onrender.com/api/webhooks/paystack
   ```
4. **Events**: Select both:
   - `charge.success`
   - `charge.failed`
5. Click **Save**

### Step 3: Verify Webhook Setup

Check that webhook is active:
- Status should show "✅ Active"
- You can see recent deliveries

---

## 🧪 Test Scenario 1: Single Payment (NGN)

### Prerequisites
- ✅ Paystack webhook configured
- ✅ Test venue exists with NGN currency
- ✅ Test user account created

### Test Steps

1. **Open Your Live App**
   ```
   https://your-app.onrender.com
   ```

2. **Log In**
   - Use test credentials
   - Navigate to booking/checkout page

3. **Create a Test Booking**
   - Select venue (NGN currency)
   - Enter amount: **₦5,000** (small amount for testing)
   - Click **"Proceed to Checkout"**

4. **Complete Payment**
   - Should redirect to Paystack payment page
   - Use test credentials (Paystack test mode)
   - Click "Pay"
   - Should return to success page

5. **Verify Success**
   ```
   ✅ Booking created in database
   ✅ Status shows "confirmed"
   ✅ Amount charged correctly
   ```

### Expected Results

**Database:**
- ✅ New booking record in `bookings` table
- ✅ `status` = 'confirmed'
- ✅ `payment_status` = 'paid'

**Emails:**
- ✅ Customer receives confirmation email
- ✅ Venue owner receives booking notification

**Platform:**
- ✅ Platform earnings recorded (10% of ₦5,000 = ₦500)

---

## 🧪 Test Scenario 2: Split Payment (Multiple Venues - NGN)

### Test Steps

1. **Navigate to Split Payment**

2. **Select Multiple Venues**
   - Choose 2 venues
   - Allocate percentage (e.g., 50/50)
   - Total: **₦10,000**

3. **Proceed to Payment**
   - Click "Pay ₦10,000"
   - Complete Paystack payment

4. **Verify**
   ```
   ✅ Booking created with all venue details
   ✅ Split recorded correctly
   ✅ Both venues get notified
   ✅ Payments distributed:
      - Platform: ₦1,000 (10%)
      - Venue A: ₦4,500 (45%)
      - Venue B: ₦4,500 (45%)
   ```

---

## 🧪 Test Scenario 3: Payment with Credits

### Test Steps

1. **Add Credits to Test Account** (in database)
   ```sql
   UPDATE profiles
   SET credits_balance = 5000
   WHERE id = 'your_test_user_id';
   ```

2. **Go to Checkout**
   - Show available credits: 5000
   - Booking amount: ₦10,000

3. **Apply Credits**
   - Use 2500 credits (₦2,500 value)
   - Amount due: ₦7,500

4. **Complete Payment**
   - Pay ₦7,500 via Paystack

5. **Verify**
   ```
   ✅ Credits deducted: 5000 → 2500
   ✅ Payment charged: ₦7,500
   ✅ Correct split applied to ₦7,500
   ✅ Credit transaction recorded
   ```

---

## 📊 Real-Time Monitoring

### Monitor Paystack Activity

1. Go to **[Paystack Dashboard](https://dashboard.paystack.com)**
2. Click **Transactions**
3. Should see your test payment:
   - Status: ✅ Success
   - Amount: ₦5,000 (or amount you paid)
   - Timestamp: Just now

### Monitor Webhook Deliveries

1. Go to **Settings** → **Webhooks**
2. Click your webhook URL
3. View **Recent Deliveries**:
   - Should see `charge.success` event
   - Status: ✅ 200 (successful)
   - Response time: < 2s

### Monitor Render Logs

1. Go to **[Render Dashboard](https://dashboard.render.com)**
2. Select your service
3. Click **Logs**
4. Watch for:
   ```
   ✅ "POST /api/webhooks/paystack 200"
   ✅ "Payment webhook processed successfully"
   ✅ "Email sent to customer"
   ✅ "Email sent to venue owner"
   ```

---

## ✅ Checklist: What to Verify After Each Test

### Payment Processing
- [ ] No error message on checkout
- [ ] Redirected to Paystack successfully
- [ ] Paystack payment page appears
- [ ] Payment completes successfully
- [ ] Redirected back to app

### Database Updates
- [ ] Booking record created
- [ ] Status is "confirmed"
- [ ] Payment status is "paid"
- [ ] Amount is correct
- [ ] Correct venue(s) associated

### Webhook Processing
- [ ] Webhook appears in Paystack logs
- [ ] Status shows 200 (success)
- [ ] In Render logs: "webhook processed"

### Email Notifications
- [ ] Customer receives email (check spam folder)
- [ ] Venue owner receives email
- [ ] Emails contain correct information
- [ ] QR code appears in email

### Platform Operations
- [ ] Platform fee recorded (10%)
- [ ] Venue earnings recorded (90%)
- [ ] Credits deducted (if used)
- [ ] Credit transaction recorded

---

## 🐛 Troubleshooting

### Issue: Payment page doesn't appear
**Check:**
1. Browser console for JavaScript errors
2. Network tab → check POST to Edge Function
3. Render logs for errors
4. Verify Paystack keys in Render environment

### Issue: Webhook not received
**Check:**
1. Paystack webhook URL is correct
2. Recent deliveries show failed (5xx) status
3. Render logs show no POST to webhook endpoint
4. Verify webhook signature verification code

### Issue: Emails not sent
**Check:**
1. Render logs for email function calls
2. Verify SendGrid credentials
3. Check spam folder
4. Paystack logs show successful payment

### Issue: Amount is wrong in database
**Check:**
1. Calculate function returns correct amount
2. Currency conversion is correct
3. Credits calculation is correct (if used)
4. Database field is numeric, not string

---

## 📋 Test Results Log

Document your tests here:

| Test | Amount | Status | Time | Notes |
|------|--------|--------|------|-------|
| Single Payment (NGN) | ₦5,000 | [ ] Pass [ ] Fail | | |
| Split Payment (2 venues) | ₦10,000 | [ ] Pass [ ] Fail | | |
| With Credits | ₦7,500 | [ ] Pass [ ] Fail | | |
| Customer Email | - | [ ] ✓ [ ] ✗ | | |
| Venue Email | - | [ ] ✓ [ ] ✗ | | |
| Webhook Processing | - | [ ] ✓ [ ] ✗ | | |

---

## 🎯 Success Criteria

All tests pass when:

✅ **Payment Flow**
- Paystack payment page appears
- Payment completes without errors
- Redirected back to app

✅ **Database**
- Booking record created with correct amount
- Status shows "confirmed"
- Venue(s) correctly associated

✅ **Webhooks**
- Paystack logs show 200 status
- Render logs show processing message
- Database updated after webhook

✅ **Emails**
- Customer receives confirmation
- Venue owner receives notification
- Emails have correct content & formatting

✅ **Platform Operations**
- Platform fee correctly calculated (10%)
- Venue earnings correctly calculated (90%)
- All amounts match expectations

---

## 🚀 After Tests Pass

Once all tests pass successfully:
1. ✅ System is production-ready
2. ✅ Move to Phase 5: Update CheckoutPage with PaymentProcessor
3. ✅ Move to Phase 6: Update SplitPaymentPage with PaymentProcessor
4. ✅ Move to Phase 7: Create unified webhook handler

---

## 📞 Quick Links

- **Paystack Dashboard**: https://dashboard.paystack.com
- **Your App**: https://your-app.onrender.com
- **Render Dashboard**: https://dashboard.render.com
- **Test Keys**: Check your Render environment variables

---

**Ready to test on live server?** Go ahead and try Test Scenario 1! 🚀

Let me know the results and we'll verify everything is working correctly.

