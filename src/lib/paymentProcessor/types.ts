/**
 * Payment Processor Types
 * Shared types for all payment processors
 */

export type Currency = 'NGN' | 'EUR' | 'GBP' | 'USD' | 'CAD' | 'AUD';
export type ProcessorType = 'paystack' | 'stripe';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Configuration for a payment
 */
export interface PaymentConfig {
  // Basic info
  email: string;
  currency: Currency;
  amount: number; // In base currency units (NGN, EUR cents, etc)
  reference: string;
  
  // Metadata
  bookingId: string;
  customerId: string;
  venueId?: string;
  
  // Credits (if applicable)
  creditsUsed?: number;
  creditsValue?: number;
  
  // For splits
  venues?: VenueShare[];
  
  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Venue share for split payments
 */
export interface VenueShare {
  venueId: string;
  venueName?: string;
  processorAccountId: string; // Paystack subaccount or Stripe account ID
  percentage: number;
  amount?: number;
}

/**
 * Payment initialization response
 */
export interface PaymentInitResponse {
  // Reference for tracking
  reference: string;
  
  // For redirects (Paystack, Stripe Checkout)
  authorizationUrl?: string;
  
  // For embedded (Stripe Elements, inline)
  clientSecret?: string;
  
  // Payment intent ID
  paymentIntentId?: string;
  
  // Processor type
  processorType: ProcessorType;
  
  // Currency
  currency: Currency;
  
  // Amount in base units
  amount: number;
}

/**
 * Fee calculation result
 */
export interface FeeCalculation {
  totalAmount: number;
  platformFee: number;
  platformFeePercentage: number;
  venueAmount: number;
}

/**
 * Split calculation result
 */
export interface SplitCalculation {
  totalAmount: number;
  platformFee: number;
  splits: {
    venue: {
      venueId: string;
      amount: number;
      percentage: number;
    };
  }[];
}

/**
 * Webhook event from payment processor
 */
export interface PaymentWebhookEvent {
  type: 'payment.success' | 'payment.failed' | 'payment.pending';
  processorType: ProcessorType;
  reference: string;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  metadata?: Record<string, any>;
  timestamp: Date;
  
  // Processor-specific data
  processorData: Record<string, any>;
}

/**
 * Webhook handler result
 */
export interface WebhookHandlerResult {
  success: boolean;
  bookingId?: string;
  message: string;
  error?: string;
}

/**
 * Payment processor interface
 */
export interface IPaymentProcessor {
  // Processor type
  type: ProcessorType;
  currency: Currency;
  
  // Initialize payment
  initializePayment(config: PaymentConfig): Promise<PaymentInitResponse>;
  
  // Calculate fees
  calculateFees(amount: number, platformFeePercentage?: number): FeeCalculation;
  
  // Build split configuration
  buildSplit(config: PaymentConfig): Promise<any>;
  
  // Handle webhook
  handleWebhook(event: PaymentWebhookEvent): Promise<WebhookHandlerResult>;
  
  // Verify signature
  verifySignature(signature: string, body: string, secret: string): boolean;
  
  // Get processor display name
  getDisplayName(): string;
}

/**
 * Currency configuration
 */
export interface CurrencyConfig {
  name: string;
  symbol: string;
  processor: ProcessorType;
  countries: string[];
  decimals: number;
  minAmount: number;
  maxAmount: number;
}

/**
 * Supported currencies mapping
 */
export type CurrenciesMap = Record<Currency, CurrencyConfig>;

/**
 * Payment processor factory result
 */
export interface ProcessorFactoryResult {
  processor: IPaymentProcessor;
  currency: Currency;
  config: CurrencyConfig;
}

/**
 * Venue payment config
 */
export interface VenuePaymentConfig {
  venueId: string;
  venueName: string;
  currency: Currency;
  processor: ProcessorType;
  processorAccountId: string; // Subaccount ID or Stripe account ID
  isConnected: boolean;
  connectedAt?: Date;
}

/**
 * Payment tracking record
 */
export interface PaymentRecord {
  id: string;
  bookingId: string;
  processorType: ProcessorType;
  processorReference: string;
  currency: Currency;
  amount: number;
  platformFee: number;
  venueAmount: number;
  status: PaymentStatus;
  creditsUsed?: number;
  creditsValue?: number;
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

