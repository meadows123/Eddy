/**
 * Test Location Override Utility
 * Use this in browser console to test different regions without VPN
 * 
 * Usage:
 *   window.setTestLocation('NG')  // Nigeria
 *   window.setTestLocation('GB')  // UK
 *   window.setTestLocation('US')  // USA
 *   window.setTestLocation('EU')  // Europe (France)
 *   window.showTestLocation()     // Show current location
 *   window.clearTestLocation()    // Clear override and use real IP
 */

const TEST_LOCATIONS = {
  NG: {
    country: 'NG',
    currency: 'NGN',
    processor: 'paystack',
    region: 'Lagos',
    latitude: 6.5244,
    longitude: 3.3792,
    description: '🇳🇬 Nigeria - Paystack'
  },
  GB: {
    country: 'GB',
    currency: 'GBP',
    processor: 'stripe',
    region: 'London',
    latitude: 51.5074,
    longitude: -0.1278,
    description: '🇬🇧 United Kingdom - Stripe'
  },
  EU: {
    country: 'FR',
    currency: 'EUR',
    processor: 'stripe',
    region: 'Paris',
    latitude: 48.8566,
    longitude: 2.3522,
    description: '🇪🇺 Europe (France) - Stripe'
  },
  US: {
    country: 'US',
    currency: 'USD',
    processor: 'stripe',
    region: 'New York',
    latitude: 40.7128,
    longitude: -74.0060,
    description: '🇺🇸 USA - Stripe'
  },
  CA: {
    country: 'CA',
    currency: 'CAD',
    processor: 'stripe',
    region: 'Toronto',
    latitude: 43.6532,
    longitude: -79.3832,
    description: '🇨🇦 Canada - Stripe'
  },
  AU: {
    country: 'AU',
    currency: 'AUD',
    processor: 'stripe',
    region: 'Sydney',
    latitude: -33.8688,
    longitude: 151.2093,
    description: '🇦🇺 Australia - Stripe'
  }
};

/**
 * Set test location override
 * @param {string} countryCode - NG, GB, EU, US, CA, AU
 */
const setTestLocation = function(countryCode) {
  const location = TEST_LOCATIONS[countryCode.toUpperCase()];
  
  if (!location) {
    console.error(`❌ Unknown location: ${countryCode}`);
    console.log('Available locations:', Object.keys(TEST_LOCATIONS).join(', '));
    return;
  }
  
  sessionStorage.setItem('userLocation', JSON.stringify(location));
  console.log(`✅ Test location set to: ${location.description}`);
  console.log('📍 Location data:', location);
  console.log('🔄 Refreshing page...');
  
  // Refresh page to apply changes
  setTimeout(() => {
    window.location.reload();
  }, 500);
};

/**
 * Show current test location
 */
const showTestLocation = function() {
  const stored = sessionStorage.getItem('userLocation');
  
  if (!stored) {
    console.log('❌ No test location set - using real IP detection');
    return;
  }
  
  const location = JSON.parse(stored);
  console.log('📍 Current test location:', location);
  console.log(`Description: ${location.description}`);
  console.log(`Currency: ${location.currency}`);
  console.log(`Processor: ${location.processor}`);
};

/**
 * Clear test location override and use real IP detection
 */
const clearTestLocation = function() {
  sessionStorage.removeItem('userLocation');
  console.log('✅ Test location cleared - will use real IP detection');
  console.log('🔄 Refreshing page...');
  
  setTimeout(() => {
    window.location.reload();
  }, 500);
};

/**
 * Show all available test locations
 */
const listTestLocations = function() {
  console.log('📋 Available test locations:');
  console.log('='.repeat(50));
  Object.entries(TEST_LOCATIONS).forEach(([code, location]) => {
    console.log(`  ${code.padEnd(5)} → ${location.description}`);
  });
  console.log('='.repeat(50));
  console.log('\n💡 Usage:');
  console.log('  window.setTestLocation("NG")     // Set to Nigeria');
  console.log('  window.setTestLocation("GB")     // Set to UK');
  console.log('  window.showTestLocation()        // Show current');
  console.log('  window.clearTestLocation()       // Reset to real IP');
  console.log('  window.listTestLocations()       // Show all options');
};

// Expose globally
if (typeof window !== 'undefined') {
  window.setTestLocation = setTestLocation;
  window.showTestLocation = showTestLocation;
  window.clearTestLocation = clearTestLocation;
  window.listTestLocations = listTestLocations;
  
  // Print help message on load
  console.log('%c🧪 Test Location Override Ready!', 'color: #4CAF50; font-size: 14px; font-weight: bold;');
  console.log('%cType window.listTestLocations() to see all options', 'color: #2196F3; font-size: 12px;');
}

export { TEST_LOCATIONS };

