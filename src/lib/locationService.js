/**
 * Location Service
 * Determines user location and appropriate payment processor/currency
 */

const IPINFO_TOKEN = import.meta.env.VITE_IPINFO_TOKEN;

/**
 * Detect user location using IP address (ipinfo.io)
 * Returns country code and currency
 */
export async function detectUserLocationByIP() {
  try {
    if (!IPINFO_TOKEN) {
      console.warn('⚠️ IPINFO_TOKEN not configured, using default (Nigeria)');
      return {
        country: 'NG',
        currency: 'NGN',
        processor: 'paystack',
        region: 'Lagos',
        latitude: 6.5244,
        longitude: 3.3792
      };
    }

    const response = await fetch(`https://ipinfo.io/json?token=${IPINFO_TOKEN}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch location from ipinfo');
    }

    const data = await response.json();
    console.log('📍 User location from IP:', data);

    return mapLocationToProcessor(data);
  } catch (error) {
    console.error('❌ Error detecting location:', error);
    // Default to Nigeria/Paystack
    return {
      country: 'NG',
      currency: 'NGN',
      processor: 'paystack',
      region: 'Lagos',
      latitude: 6.5244,
      longitude: 3.3792
    };
  }
}

/**
 * Map ipinfo data to payment processor config
 */
function mapLocationToProcessor(ipinfoData) {
  const country = ipinfoData.country;
  const currency = ipinfoData.currency || 'NGN';
  
  // Nigerian locations use Paystack
  if (country === 'NG') {
    return {
      country: 'NG',
      currency: 'NGN',
      processor: 'paystack',
      region: ipinfoData.region || ipinfoData.city || 'Lagos',
      latitude: parseFloat(ipinfoData.loc?.split(',')[0]) || 6.5244,
      longitude: parseFloat(ipinfoData.loc?.split(',')[1]) || 3.3792
    };
  }

  // European locations use Stripe
  const europeanCountries = ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'IE'];
  if (europeanCountries.includes(country)) {
    const currencyMap = {
      'GBP': 'GBP',
      'EUR': 'EUR',
      'SEK': 'EUR', // Approximate
      'NOK': 'EUR', // Approximate
      'DKK': 'EUR', // Approximate
      'CHF': 'EUR', // Approximate
      'PLN': 'EUR', // Approximate
    };
    
    return {
      country: country,
      currency: currencyMap[currency] || 'EUR',
      processor: 'stripe',
      region: ipinfoData.region || ipinfoData.city || 'Europe',
      latitude: parseFloat(ipinfoData.loc?.split(',')[0]) || 51.5074,
      longitude: parseFloat(ipinfoData.loc?.split(',')[1]) || -0.1278
    };
  }

  // USA and other supported regions use Stripe
  if (country === 'US' || country === 'CA' || country === 'AU') {
    const currencyMap = {
      'USD': 'USD',
      'CAD': 'CAD',
      'AUD': 'AUD',
    };
    
    return {
      country: country,
      currency: currencyMap[currency] || 'USD',
      processor: 'stripe',
      region: ipinfoData.region || ipinfoData.city,
      latitude: parseFloat(ipinfoData.loc?.split(',')[0]),
      longitude: parseFloat(ipinfoData.loc?.split(',')[1])
    };
  }

  // Default to Paystack for unknown locations (assuming developing markets)
  return {
    country: country,
    currency: 'NGN',
    processor: 'paystack',
    region: ipinfoData.city || 'Unknown',
    latitude: parseFloat(ipinfoData.loc?.split(',')[0]) || 6.5244,
    longitude: parseFloat(ipinfoData.loc?.split(',')[1]) || 3.3792
  };
}

/**
 * Get user location from browser geolocation API
 * Fallback to IP detection if permission denied
 */
export async function getUserLocationWithFallback() {
  return new Promise((resolve) => {
    // Check if test location is set first
    const testLocation = getLocationFromSession();
    if (testLocation && testLocation.processor) {
      console.log('🧪 Using test location override:', testLocation);
      resolve(testLocation);
      return;
    }

    if (!navigator.geolocation) {
      console.log('❌ Geolocation not supported, using IP detection');
      detectUserLocationByIP().then(resolve);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.log('⏱️ Geolocation timeout, using IP detection');
      detectUserLocationByIP().then(resolve);
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude } = position.coords;
        console.log('📍 Geolocation detected:', { latitude, longitude });
        
        // For now, use IP detection for currency mapping
        // In future, could reverse-geocode these coordinates
        detectUserLocationByIP().then(resolve);
      },
      (error) => {
        clearTimeout(timeoutId);
        console.log('📍 Geolocation permission denied or unavailable, using IP detection');
        detectUserLocationByIP().then(resolve);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 300000
      }
    );
  });
}

/**
 * Store location in session storage
 */
export function storeLocationInSession(locationData) {
  try {
    sessionStorage.setItem('userLocation', JSON.stringify(locationData));
  } catch (error) {
    console.warn('Failed to store location in session:', error);
  }
}

/**
 * Retrieve location from session storage
 */
export function getLocationFromSession() {
  try {
    const stored = sessionStorage.getItem('userLocation');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to retrieve location from session:', error);
    return null;
  }
}

/**
 * Get payment processor based on currency
 */
export function getPaymentProcessorForCurrency(currency) {
  const processorMap = {
    'NGN': 'paystack',
    'EUR': 'stripe',
    'GBP': 'stripe',
    'USD': 'stripe',
    'CAD': 'stripe',
    'AUD': 'stripe'
  };
  
  return processorMap[currency] || 'paystack';
}

/**
 * Set test location override for development/testing
 * This allows manually setting location to test different payment processors
 * 
 * @param {Object} locationConfig - Location configuration
 * @param {string} locationConfig.country - Country code (e.g., 'NG', 'GB', 'US')
 * @param {string} locationConfig.currency - Currency code (e.g., 'NGN', 'GBP', 'USD')
 * @param {string} locationConfig.processor - Payment processor ('paystack' or 'stripe')
 * @param {string} [locationConfig.region] - Region name (optional)
 * @param {number} [locationConfig.latitude] - Latitude (optional)
 * @param {number} [locationConfig.longitude] - Longitude (optional)
 * 
 * @example
 * // Set to Nigeria/Paystack
 * setTestLocation({ country: 'NG', currency: 'NGN', processor: 'paystack' });
 * 
 * // Set to UK/Stripe
 * setTestLocation({ country: 'GB', currency: 'GBP', processor: 'stripe' });
 * 
 * // Clear test location (use auto-detection)
 * clearTestLocation();
 */
export function setTestLocation(locationConfig) {
  const testLocation = {
    country: locationConfig.country || 'NG',
    currency: locationConfig.currency || 'NGN',
    processor: locationConfig.processor || 'paystack',
    region: locationConfig.region || 'Test Location',
    latitude: locationConfig.latitude || 6.5244,
    longitude: locationConfig.longitude || 3.3792,
    isTest: true // Mark as test location
  };
  
  storeLocationInSession(testLocation);
  console.log('🧪 Test location set:', testLocation);
  return testLocation;
}

/**
 * Clear test location override and use auto-detection
 */
export function clearTestLocation() {
  try {
    sessionStorage.removeItem('userLocation');
    console.log('🧪 Test location cleared - will use auto-detection');
  } catch (error) {
    console.warn('Failed to clear test location:', error);
  }
}

/**
 * Quick helper functions for common test locations
 */
export const TestLocations = {
  nigeria: () => setTestLocation({
    country: 'NG',
    currency: 'NGN',
    processor: 'paystack',
    region: 'Lagos, Nigeria',
    latitude: 6.5244,
    longitude: 3.3792
  }),
  
  uk: () => setTestLocation({
    country: 'GB',
    currency: 'GBP',
    processor: 'stripe',
    region: 'London, UK',
    latitude: 51.5074,
    longitude: -0.1278
  }),
  
  usa: () => setTestLocation({
    country: 'US',
    currency: 'USD',
    processor: 'stripe',
    region: 'New York, USA',
    latitude: 40.7128,
    longitude: -74.0060
  }),
  
  europe: () => setTestLocation({
    country: 'DE',
    currency: 'EUR',
    processor: 'stripe',
    region: 'Berlin, Germany',
    latitude: 52.5200,
    longitude: 13.4050
  })
};

