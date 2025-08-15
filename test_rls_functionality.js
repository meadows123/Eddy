// Test script to verify RLS functionality
// Run this after applying the RLS migration to ensure everything works

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSFunctionality() {
  console.log('🧪 Testing RLS Functionality...\n');

  try {
    // Test 1: Check RLS status for all tables
    console.log('1. Checking RLS status for all tables...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('check_rls_status');
    
    if (rlsError) {
      console.error('❌ Error checking RLS status:', rlsError);
    } else {
      console.log('✅ RLS Status:');
      rlsStatus.forEach(table => {
        console.log(`   ${table.table_name}: RLS ${table.rls_enabled ? '✅ Enabled' : '❌ Disabled'} (${table.policy_count} policies)`);
      });
    }

    // Test 2: Try to access data without authentication (should be restricted)
    console.log('\n2. Testing unauthenticated access...');
    
    const { data: venuesUnauth, error: venuesUnauthError } = await supabase
      .from('venues')
      .select('*')
      .limit(1);
    
    if (venuesUnauthError) {
      console.log('✅ Unauthenticated access properly restricted:', venuesUnauthError.message);
    } else {
      console.log('⚠️  Warning: Unauthenticated access might not be properly restricted');
    }

    // Test 3: Test authenticated access (if you have a test user)
    console.log('\n3. Testing authenticated access...');
    
    // Note: This requires a test user to be logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log(`✅ User authenticated: ${user.email}`);
      
      // Test reading own profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.log('❌ Error accessing own profile:', profileError.message);
      } else {
        console.log('✅ Successfully accessed own profile');
      }
      
      // Test reading venues (should work for public data)
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('*')
        .limit(1);
      
      if (venuesError) {
        console.log('❌ Error accessing venues:', venuesError.message);
      } else {
        console.log(`✅ Successfully accessed venues (${venues.length} records)`);
      }
      
    } else {
      console.log('ℹ️  No authenticated user - skipping authenticated tests');
    }

    // Test 4: Check specific table policies
    console.log('\n4. Checking policies for key tables...');
    
    const keyTables = ['venues', 'bookings', 'profiles', 'split_payment_requests'];
    
    for (const tableName of keyTables) {
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_table_policies', { p_table_name: tableName });
      
      if (policiesError) {
        console.log(`❌ Error checking policies for ${tableName}:`, policiesError.message);
      } else {
        console.log(`✅ ${tableName} policies (${policies.length}):`);
        policies.forEach(policy => {
          console.log(`   - ${policy.policy_name} (${policy.operation})`);
        });
      }
    }

    console.log('\n🎉 RLS Testing Complete!');
    
    // Summary
    console.log('\n📋 Summary:');
    console.log('- RLS should be enabled on all tables');
    console.log('- Unauthenticated access should be restricted');
    console.log('- Authenticated users should only access their own data');
    console.log('- Public data (venues, reviews) should be readable by everyone');
    console.log('- Venue owners should be able to manage their venues');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRLSFunctionality();

export { testRLSFunctionality }; 