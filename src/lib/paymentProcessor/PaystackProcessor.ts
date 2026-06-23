/**
 * Paystack Payment Processor
 * Handles payments for Nigeria (NGN currency)
 */

import PaymentProcessor from './PaymentProcessor';
import type {
  PaymentConfig,
  PaymentInitResponse,
  PaymentWebhookEvent,
  WebhookHandlerResult,
  VenueShare
} from './types';
import { buildPaystackPayload } from '../paystackHelper';
import { getCurrencyConfig } from './currencies';

export class PaystackProcessor extends PaymentProcessor {
  type: 'paystack' = 'paystack';
  currency: 'NGN' = 'NGN';
  private apiUrl = 'https://api.paystack.co';
  private secretKey: string;

  constructor() {
    const config = getCurrencyConfig('NGN');
    super(config);
    
    // Get secret key from environment
    this.secretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY || 
                     process.env.PAYSTACK_SECRET_KEY || '';
    
    if (!this.secretKey) {
      throw new Error('Paystack secret key not configured');
    }
  }

  /**
   * Initialize a Paystack payment
   */
  async initializePayment(config: PaymentConfig): Promise<PaymentInitResponse> {
    try {
      // Validate
      this.validateConfig(config);
      this.validateAmount(config.amount);

      // Build Paystack split payload
      const payload = this.buildPaystackPayload(config);

      // Call Paystack API
      const response = await fetch(`${this.apiUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Paystack API error: ${error.message}`);
      }

      const data = await response.json();

      if (!data.data?.reference) {
        throw new Error('No payment reference returned from Paystack');
      }

      return {
        reference: data.data.reference,
        authorizationUrl: data.data.authorization_url,
        processorType: 'paystack',
        currency: 'NGN',
        amount: config.amount,
        paymentIntentId: data.data.reference
      };
    } catch (error) {
      console.error('❌ Paystack payment initialization failed:', error);
      throw error;
    }
  }

  /**
   * Build Paystack split payload
   */
  private buildPaystackPayload(config: PaymentConfig): any {
    const amountInKobo = this.toSmallestUnit(config.amount);

    // Determine if single or split payment
    if (config.venues && config.venues.length > 1) {
      // Multi-venue split
      return this.buildSplitPayload(config, amountInKobo);
    } else if (config.venues && config.venues.length === 1) {
      // Single venue payment
      return this.buildSinglePayload(config, amountInKobo);
    } else {
      // Platform-only payment (no venue)
      return this.buildPlatformPayload(config, amountInKobo);
    }
  }

  /**
   * Build single venue split
   */
  private buildSinglePayload(config: PaymentConfig, amountInKobo: number): any {
    const venue = config.venues![0];
    const fees = this.calculateFees(config.amount, 10); // 10% platform fee

    const platformSubaccount = process.env.PAYSTACK_PLATFORM_SUBACCOUNT;
    if (!platformSubaccount) {
      throw new Error('Platform Paystack subaccount not configured');
    }

    return {
      email: config.email,
      amount: amountInKobo,
      reference: config.reference,
      split: {
        type: 'percentage',
        subaccounts: [
          {
            subaccount: platformSubaccount,
            share: 10 // Platform gets 10%
          },
          {
            subaccount: venue.processorAccountId,
            share: 90 // Venue gets 90%
          }
        ]
      },
      metadata: {
        booking_id: config.bookingId,
        customer_id: config.customerId,
        venue_id: config.venueId,
        credits_used: config.creditsUsed || 0,
        credits_value: config.creditsValue || 0,
        ...config.metadata
      }
    };
  }

  /**
   * Build multi-venue split
   */
  private buildSplitPayload(config: PaymentConfig, amountInKobo: number): any {
    const platformSubaccount = process.env.PAYSTACK_PLATFORM_SUBACCOUNT;
    if (!platformSubaccount) {
      throw new Error('Platform Paystack subaccount not configured');
    }

    const platformFeePercentage = 10;
    const venueShareTotal = 100 - platformFeePercentage;

    // Calculate venue percentages
    const venueCount = config.venues!.length;
    const venuePercentageEach = venueShareTotal / venueCount;

    const subaccounts = [
      {
        subaccount: platformSubaccount,
        share: platformFeePercentage
      }
    ];

    // Add each venue
    for (const venue of config.venues!) {
      subaccounts.push({
        subaccount: venue.processorAccountId,
        share: venuePercentageEach
      });
    }

    return {
      email: config.email,
      amount: amountInKobo,
      reference: config.reference,
      split: {
        type: 'percentage',
        subaccounts
      },
      metadata: {
        booking_id: config.bookingId,
        customer_id: config.customerId,
        venues_count: venueCount,
        credits_used: config.creditsUsed || 0,
        credits_value: config.creditsValue || 0,
        ...config.metadata
      }
    };
  }

  /**
   * Build platform-only payment (no venue)
   */
  private buildPlatformPayload(config: PaymentConfig, amountInKobo: number): any {
    // Simple payment without split
    return {
      email: config.email,
      amount: amountInKobo,
      reference: config.reference,
      metadata: {
        booking_id: config.bookingId,
        customer_id: config.customerId,
        transaction_type: 'platform_only',
        ...config.metadata
      }
    };
  }

  /**
   * Handle Paystack webhook
   */
  async handleWebhook(event: PaymentWebhookEvent): Promise<WebhookHandlerResult> {
    try {
      // Verify signature
      const signature = event.processorData.signature;
      if (!this.verifySignature(signature, JSON.stringify(event.processorData), this.secretKey)) {
        return {
          success: false,
          message: 'Invalid signature',
          error: 'Signature verification failed'
        };
      }

      // Check status
      if (event.status !== 'completed') {
        return {
          success: false,
          message: `Payment ${event.status}`,
          error: `Payment status: ${event.status}`
        };
      }

      // Get booking details from metadata
      const bookingId = event.processorData.metadata?.booking_id;
      const creditsUsed = event.processorData.metadata?.credits_used || 0;

      if (!bookingId) {
        return {
          success: false,
          message: 'No booking ID in metadata',
          error: 'Missing booking information'
        };
      }

      return {
        success: true,
        bookingId,
        message: 'Payment confirmed'
      };
    } catch (error) {
      console.error('❌ Paystack webhook handling failed:', error);
      return {
        success: false,
        message: 'Webhook processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify Paystack webhook signature
   */
  verifySignature(signature: string, body: string, secret: string): boolean {
    try {
      // Paystack uses SHA512
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', secret)
        .update(body)
        .digest('hex');
      
      return hash === signature;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Get display name
   */
  getDisplayName(): string {
    return 'Paystack';
  }

  /**
   * Build split (async wrapper)
   */
  async buildSplit(config: PaymentConfig): Promise<any> {
    const amountInKobo = this.toSmallestUnit(config.amount);
    return this.buildPaystackPayload(config);
  }
}

export default PaystackProcessor;

