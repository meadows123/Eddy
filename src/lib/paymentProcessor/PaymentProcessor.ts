/**
 * Abstract Payment Processor Base Class
 * All payment processors (Paystack, Stripe, etc) extend this
 */

import type {
  IPaymentProcessor,
  PaymentConfig,
  PaymentInitResponse,
  FeeCalculation,
  PaymentWebhookEvent,
  WebhookHandlerResult,
  ProcessorType,
  Currency,
  CurrencyConfig
} from './types';

/**
 * Abstract base class for all payment processors
 */
export abstract class PaymentProcessor implements IPaymentProcessor {
  abstract type: ProcessorType;
  abstract currency: Currency;
  protected config: CurrencyConfig;
  
  constructor(config: CurrencyConfig) {
    this.config = config;
  }

  /**
   * Initialize a payment
   * Must be implemented by each processor
   */
  abstract initializePayment(config: PaymentConfig): Promise<PaymentInitResponse>;

  /**
   * Handle webhook event
   * Must be implemented by each processor
   */
  abstract handleWebhook(event: PaymentWebhookEvent): Promise<WebhookHandlerResult>;

  /**
   * Verify webhook signature
   * Must be implemented by each processor
   */
  abstract verifySignature(signature: string, body: string, secret: string): boolean;

  /**
   * Calculate fees for an amount
   * Default implementation: platform takes percentage
   */
  calculateFees(amount: number, platformFeePercentage: number = 10): FeeCalculation {
    const platformFee = Math.round((amount * platformFeePercentage) / 100);
    const venueAmount = amount - platformFee;

    return {
      totalAmount: amount,
      platformFee,
      platformFeePercentage,
      venueAmount
    };
  }

  /**
   * Build split configuration
   * Default implementation: single split
   */
  async buildSplit(config: PaymentConfig): Promise<any> {
    throw new Error('buildSplit must be implemented by processor');
  }

  /**
   * Get display name for processor
   */
  abstract getDisplayName(): string;

  /**
   * Validate configuration
   */
  protected validateConfig(config: PaymentConfig): void {
    if (!config.email || !config.email.includes('@')) {
      throw new Error('Invalid email address');
    }

    if (!config.amount || config.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!config.reference) {
      throw new Error('Reference is required');
    }

    if (config.currency !== this.currency) {
      throw new Error(`Processor configured for ${this.currency}, received ${config.currency}`);
    }
  }

  /**
   * Convert amount to smallest currency unit
   * E.g., NGN to kobo, EUR to cents
   */
  protected toSmallestUnit(amount: number): number {
    return Math.round(amount * Math.pow(10, this.config.decimals));
  }

  /**
   * Convert from smallest unit to base currency
   * E.g., kobo to NGN, cents to EUR
   */
  protected fromSmallestUnit(amount: number): number {
    return amount / Math.pow(10, this.config.decimals);
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number): string {
    return `${this.config.symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: this.config.decimals,
      maximumFractionDigits: this.config.decimals
    })}`;
  }

  /**
   * Check if amount is within allowed range
   */
  protected validateAmount(amount: number): void {
    if (amount < this.config.minAmount) {
      throw new Error(`Amount must be at least ${this.formatAmount(this.config.minAmount)}`);
    }

    if (amount > this.config.maxAmount) {
      throw new Error(`Amount cannot exceed ${this.formatAmount(this.config.maxAmount)}`);
    }
  }

  /**
   * Generate a unique reference
   */
  protected generateReference(prefix: string = ''): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${prefix}${timestamp}-${random}`.toLowerCase();
  }

  /**
   * Get currency symbol
   */
  getSymbol(): string {
    return this.config.symbol;
  }

  /**
   * Get currency name
   */
  getCurrencyName(): string {
    return this.config.name;
  }

  /**
   * Get supported countries
   */
  getSupportedCountries(): string[] {
    return this.config.countries;
  }

  /**
   * Get number of decimal places
   */
  getDecimals(): number {
    return this.config.decimals;
  }

  /**
   * Get minimum transaction amount
   */
  getMinimumAmount(): number {
    return this.config.minAmount;
  }

  /**
   * Get maximum transaction amount
   */
  getMaximumAmount(): number {
    return this.config.maxAmount;
  }
}

export default PaymentProcessor;

