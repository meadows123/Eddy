/**
 * Payment Processor Factory
 * Central entry point for accessing payment processors
 */

import type { Currency, ProcessorType, IPaymentProcessor } from './types';
import PaymentProcessor from './PaymentProcessor';
import PaystackProcessor from './PaystackProcessor';
import StripeProcessor from './StripeProcessor';
import { CURRENCIES, getProcessorForCurrency, isSupportedCurrency } from './currencies';

/**
 * Payment processor factory
 * Creates and returns the appropriate processor for a currency
 */
export class PaymentProcessorFactory {
  private static instances: Map<Currency, IPaymentProcessor> = new Map();

  /**
   * Get processor for a currency
   */
  static getProcessor(currency: Currency): IPaymentProcessor {
    // Check if supported
    if (!isSupportedCurrency(currency)) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    // Return cached instance if available
    if (this.instances.has(currency)) {
      return this.instances.get(currency)!;
    }

    // Create new instance
    let processor: IPaymentProcessor;

    const processorType = getProcessorForCurrency(currency);

    switch (processorType) {
      case 'paystack':
        processor = new PaystackProcessor();
        break;
      case 'stripe':
        processor = new StripeProcessor(currency);
        break;
      default:
        throw new Error(`Unknown processor type: ${processorType}`);
    }

    // Cache and return
    this.instances.set(currency, processor);
    return processor;
  }

  /**
   * Get processor by type (returns first currency for that type)
   */
  static getProcessorByType(type: ProcessorType): IPaymentProcessor {
    // Find first currency for this processor
    const currency = Object.keys(CURRENCIES).find(
      (curr) => CURRENCIES[curr as Currency].processor === type
    ) as Currency;

    if (!currency) {
      throw new Error(`No currencies available for processor: ${type}`);
    }

    return this.getProcessor(currency);
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.instances.clear();
  }

  /**
   * Check if currency is supported
   */
  static isCurrencySupported(currency: string): currency is Currency {
    return isSupportedCurrency(currency);
  }

  /**
   * Get all supported currencies
   */
  static getSupportedCurrencies(): Currency[] {
    return Object.keys(CURRENCIES) as Currency[];
  }

  /**
   * Get currencies for processor
   */
  static getCurrenciesForProcessor(processor: ProcessorType): Currency[] {
    return this.getSupportedCurrencies().filter(
      (curr) => getProcessorForCurrency(curr) === processor
    );
  }
}

// Export all types
export * from './types';
export * from './currencies';
export { PaymentProcessor, PaystackProcessor, StripeProcessor };

// Default exports
export default PaymentProcessorFactory;

