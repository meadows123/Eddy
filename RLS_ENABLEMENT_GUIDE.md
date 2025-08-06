# 🔒 Row Level Security (RLS) Enablement Guide

## 🎯 **Objective**
Safely enable Row Level Security on all database tables to ensure proper data access control without breaking existing functionality.

## 📋 **Pre-Enablement Checklist**

### **1. Backup Your Database**
```bash
# Create a backup before making changes
npx supabase db dump --data-only > backup_$(date +%Y%m%d_%H%M%S).sql
```

### **2. Verify Current RLS Status**
```sql
-- Run this in Supabase SQL Editor to check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;
```

### **3. Test Current Functionality**
- [ ] Test user registration/login
- [ ] Test venue browsing
- [ ] Test booking creation
- [ ] Test venue owner dashboard
- [ ] Test split payment functionality
- [ ] Test contact form

## 🚀 **Step-by-Step Enablement Process**

### **Step 1: Apply the Comprehensive RLS Migration**
```bash
# Apply the migration that enables RLS on all tables
npx supabase db push
```

### **Step 2: Verify RLS is Enabled**
```sql
-- Check RLS status for all tables
SELECT * FROM check_rls_status();
```

### **Step 3: Test Each Feature**
Run through each feature to ensure it still works:

#### **A. Public Features (Should Still Work)**
- [ ] Venue browsing (public read access)
- [ ] Venue details viewing
- [ ] Contact form submission
- [ ] User registration

#### **B. Authenticated User Features**
- [ ] User login
- [ ] Profile viewing/editing
- [ ] Booking creation
- [ ] Saved venues management
- [ ] Split payment requests

#### **C. Venue Owner Features**
- [ ] Venue owner login
- [ ] Venue management
- [ ] Booking management
- [ ] Image management
- [ ] Analytics viewing

### **Step 4: Monitor for Issues**
Watch for these common RLS-related errors:

#### **Common Error Messages:**
```
- "new row violates row-level security policy"
- "permission denied for table"
- "no policy found for table"
```

#### **Quick Fixes:**
1. **Missing Policy**: Add the missing RLS policy
2. **Wrong User Context**: Ensure user is properly authenticated
3. **Service Role Access**: Use service role for admin operations

## 🔧 **Troubleshooting Common Issues**

### **Issue 1: Users Can't Access Their Own Data**
**Symptoms:**
- Users can't view their profile
- Users can't see their bookings
- "permission denied" errors

**Solution:**
```sql
-- Check if user_profiles has proper policies
SELECT * FROM get_table_policies('user_profiles');

-- If missing, add the policy:
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());
```

### **Issue 2: Venue Owners Can't Manage Their Venues**
**Symptoms:**
- Venue owners can't edit venue details
- Can't upload images
- Can't view bookings

**Solution:**
```sql
-- Check venue policies
SELECT * FROM get_table_policies('venues');

-- Ensure venue owner policy exists:
CREATE POLICY "Venue owners can manage their venues" ON venues
    FOR ALL USING (owner_id = auth.uid());
```

### **Issue 3: Public Data Not Accessible**
**Symptoms:**
- Venues not showing on homepage
- Reviews not visible
- "permission denied" for public data

**Solution:**
```sql
-- Add public read policy:
CREATE POLICY "Venues are viewable by everyone" ON venues
    FOR SELECT USING (true);
```

### **Issue 4: Split Payments Not Working**
**Symptoms:**
- Can't create split payment requests
- Can't view payment requests
- "permission denied" errors

**Solution:**
```sql
-- Check split payment policies
SELECT * FROM get_table_policies('split_payment_requests');

-- Ensure proper policies exist for requesters and recipients
```

## 🧪 **Testing Scripts**

### **Run the RLS Test Script**
```bash
# Run the comprehensive RLS test
node test_rls_functionality.js
```

### **Manual Testing Checklist**
```bash
# Test as anonymous user
- [ ] Can browse venues
- [ ] Cannot access user data
- [ ] Cannot create bookings

# Test as authenticated user
- [ ] Can view own profile
- [ ] Can create bookings
- [ ] Can manage saved venues
- [ ] Cannot access other users' data

# Test as venue owner
- [ ] Can manage own venues
- [ ] Can view venue bookings
- [ ] Can upload venue images
- [ ] Cannot access other venues
```

## 🔄 **Rollback Plan**

If issues arise, you can rollback:

### **Option 1: Disable RLS on Specific Tables**
```sql
-- Disable RLS on a problematic table
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### **Option 2: Remove Specific Policies**
```sql
-- Remove a problematic policy
DROP POLICY "policy_name" ON table_name;
```

### **Option 3: Full Rollback**
```bash
# Restore from backup
npx supabase db reset
# Then restore your data
```

## 📊 **Monitoring & Maintenance**

### **Regular Checks**
1. **Weekly**: Run RLS status check
2. **Monthly**: Review access patterns
3. **Quarterly**: Audit policies

### **Monitoring Queries**
```sql
-- Check for tables without RLS
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- Check for tables without policies
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
AND p.policyname IS NULL;
```

## ✅ **Success Criteria**

RLS is successfully enabled when:

1. **✅ All tables have RLS enabled**
2. **✅ All tables have appropriate policies**
3. **✅ Public features work for anonymous users**
4. **✅ Authenticated users can access their own data**
5. **✅ Venue owners can manage their venues**
6. **✅ No unauthorized data access is possible**
7. **✅ No functionality is broken**

## 🆘 **Emergency Contacts**

If you encounter critical issues:

1. **Immediate**: Disable RLS on problematic tables
2. **Short-term**: Use service role for critical operations
3. **Long-term**: Review and fix policies

## 📝 **Documentation**

After successful enablement:

1. **Update this guide** with any issues encountered
2. **Document any custom policies** added
3. **Create runbook** for common issues
4. **Train team** on RLS troubleshooting

---

**🎉 Congratulations!** Your application now has proper Row Level Security enabled, ensuring data privacy and security for all users. 