/**
 * Currency Configuration
 * Defines all supported currencies and their payment processors
 */

import type { Currency, CurrenciesMap } from './types';

/**
 * Supported currencies with their configurations
 */
export const CURRENCIES: CurrenciesMap = {
  NGN: {
    name: 'Nigerian Naira',
    symbol: '₦',
    processor: 'paystack',
    countries: ['Nigeria'],
    decimals: 0, // NGN doesn't use decimals (no kobo display)
    minAmount: 100, // ₦100 minimum
    maxAmount: 50000000 // ₦50 million maximum
  },
  EUR: {
    name: 'Euro',
    symbol: '€',
    processor: 'stripe',
    countries: ['Austria', 'Belgium', 'Cyprus', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Portugal', 'Slovakia', 'Slovenia', 'Spain'],
    decimals: 2,
    minAmount: 0.50, // €0.50 minimum
    maxAmount: 999999 // €999,999 maximum
  },
  GBP: {
    name: 'British Pound',
    symbol: '£',
    processor: 'stripe',
    countries: ['United Kingdom', 'Isle of Man', 'Guernsey', 'Jersey'],
    decimals: 2,
    minAmount: 0.30, // £0.30 minimum
    maxAmount: 999999 // £999,999 maximum
  },
  USD: {
    name: 'US Dollar',
    symbol: '$',
    processor: 'stripe',
    countries: ['United States', 'Canada', 'Australia'],
    decimals: 2,
    minAmount: 0.50, // $0.50 minimum
    maxAmount: 999999 // $999,999 maximum
  },
  CAD: {
    name: 'Canadian Dollar',
    symbol: 'C$',
    processor: 'stripe',
    countries: ['Canada'],
    decimals: 2,
    minAmount: 0.50,
    maxAmount: 999999
  },
  AUD: {
    name: 'Australian Dollar',
    symbol: 'A$',
    processor: 'stripe',
    countries: ['Australia'],
    decimals: 2,
    minAmount: 0.50,
    maxAmount: 999999
  }
};

/**
 * Get currency configuration
 */
export function getCurrencyConfig(currency: Currency) {
  const config = CURRENCIES[currency];
  if (!config) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return config;
}

/**
 * Check if currency is supported
 */
export function isSupportedCurrency(currency: string): currency is Currency {
  return currency in CURRENCIES;
}

/**
 * Get processor type for currency
 */
export function getProcessorForCurrency(currency: Currency) {
  return getCurrencyConfig(currency).processor;
}

/**
 * Get all currencies for a processor
 */
export function getCurrenciesForProcessor(processor: 'paystack' | 'stripe'): Currency[] {
  return (Object.keys(CURRENCIES) as Currency[]).filter(
    currency => CURRENCIES[currency].processor === processor
  );
}

/**
 * Get currencies available in a specific country
 */
export function getCurrenciesInCountry(country: string): Currency[] {
  return (Object.keys(CURRENCIES) as Currency[]).filter(
    currency => CURRENCIES[currency].countries.includes(country)
  );
}

/**
 * Get country from currency (returns first country if multiple)
 */
export function getCountryForCurrency(currency: Currency): string | null {
  const config = getCurrencyConfig(currency);
  return config.countries[0] || null;
}

/**
 * Format amount with currency
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const config = getCurrencyConfig(currency);
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals
  });
  return `${config.symbol}${formatted}`;
}

/**
 * Convert between currencies (for display only, not for actual conversion)
 * This is for informational purposes only
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRate: number
): number {
  const fromConfig = getCurrencyConfig(fromCurrency);
  const toConfig = getCurrencyConfig(toCurrency);
  
  // Normalize to base units
  const baseAmount = amount / Math.pow(10, fromConfig.decimals);
  
  // Apply exchange rate
  const convertedAmount = baseAmount * exchangeRate;
  
  // Convert to target currency units
  return convertedAmount * Math.pow(10, toConfig.decimals);
}

/**
 * List all supported currencies
 */
export function listSupportedCurrencies() {
  return Object.entries(CURRENCIES).map(([code, config]) => ({
    code: code as Currency,
    ...config
  }));
}

/**
 * Get currency by country
 * Returns the first/primary currency for the country
 */
export function getCurrencyByCountry(country: string): Currency | null {
  for (const [currency, config] of Object.entries(CURRENCIES)) {
    if (config.countries.includes(country)) {
      return currency as Currency;
    }
  }
  return null;
}

export default CURRENCIES;

