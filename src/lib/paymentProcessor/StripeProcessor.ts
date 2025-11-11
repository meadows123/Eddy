/**
 * Stripe Payment Processor
 * Handles payments for Europe and other regions (EUR, GBP, USD, etc)
 */

import PaymentProcessor from './PaymentProcessor';
import type {
  PaymentConfig,
  PaymentInitResponse,
  PaymentWebhookEvent,
  WebhookHandlerResult,
  Currency
} from './types';
import { getCurrencyConfig } from './currencies';

export class StripeProcessor extends PaymentProcessor {
  type: 'stripe' = 'stripe';
  currency: Currency;
  private apiUrl = 'https://api.stripe.com/v1';
  private secretKey: string;
  private publishableKey: string;

  constructor(currency: Currency = 'EUR') {
    const config = getCurrencyConfig(currency);
    
    if (config.processor !== 'stripe') {
      throw new Error(`${currency} is not supported by Stripe processor`);
    }

    super(config);
    this.currency = currency;

    // Get keys from environment
    this.secretKey = import.meta.env.VITE_STRIPE_SECRET_KEY || 
                    process.env.STRIPE_SECRET_KEY || '';
    
    this.publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
                         process.env.STRIPE_PUBLISHABLE_KEY || '';

    if (!this.secretKey) {
      throw new Error('Stripe secret key not configured');
    }
  }

  /**
   * Initialize a Stripe payment
   */
  async initializePayment(config: PaymentConfig): Promise<PaymentInitResponse> {
    try {
      // Validate
      this.validateConfig(config);
      this.validateAmount(config.amount);

      // Convert to smallest currency unit (cents)
      const amountInCents = this.toSmallestUnit(config.amount);

      // Calculate application fee (platform fee)
      const platformFeePercentage = 10;
      const platformFeeCents = Math.round((amountInCents * platformFeePercentage) / 100);

      // Determine payment intent parameters
      let paymentIntentParams: any = {
        amount: amountInCents,
        currency: this.currency.toLowerCase(),
        payment_method_types: ['card'],
        metadata: {
          booking_id: config.bookingId,
          customer_id: config.customerId,
          venue_id: config.venueId,
          credits_used: config.creditsUsed || 0,
          credits_value: config.creditsValue || 0,
          ...config.metadata
        }
      };

      // For single venue, use connect
      if (config.venues && config.venues.length === 1) {
        paymentIntentParams = {
          ...paymentIntentParams,
          application_fee_amount: platformFeeCents,
          transfer_data: {
            destination: config.venues[0].processorAccountId
          }
        };
      } else if (config.venues && config.venues.length > 1) {
        // For multi-venue, we'll need to handle this differently
        // In Stripe, we typically split after payment or use transfers
        // For now, apply full platform fee
        paymentIntentParams.application_fee_amount = platformFeeCents;
      }

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(paymentIntentParams);

      return {
        reference: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        processorType: 'stripe',
        currency: this.currency,
        amount: config.amount,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('❌ Stripe payment initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create Stripe payment intent via API
   */
  private async createPaymentIntent(params: any): Promise<any> {
    const formData = new URLSearchParams();
    
    // Convert params to form data
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (typeof value === 'object') {
        // Handle nested objects
        Object.keys(value).forEach(subKey => {
          formData.append(`${key}[${subKey}]`, value[subKey]);
        });
      } else {
        formData.append(key, value);
      }
    });

    const response = await fetch(`${this.apiUrl}/payment_intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Stripe API error: ${error.error?.message}`);
    }

    return response.json();
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(event: PaymentWebhookEvent): Promise<WebhookHandlerResult> {
    try {
      const stripeEvent = event.processorData;

      // Verify signature
      if (!this.verifySignature(
        stripeEvent.signature,
        JSON.stringify(stripeEvent),
        process.env.STRIPE_WEBHOOK_SECRET || ''
      )) {
        return {
          success: false,
          message: 'Invalid signature',
          error: 'Signature verification failed'
        };
      }

      // Handle specific event types
      switch (stripeEvent.type) {
        case 'payment_intent.succeeded':
          return this.handlePaymentIntentSucceeded(stripeEvent.data.object);
        
        case 'payment_intent.payment_failed':
          return this.handlePaymentIntentFailed(stripeEvent.data.object);
        
        default:
          return {
            success: true,
            message: `Event ${stripeEvent.type} received`,
            error: 'Event type not handled'
          };
      }
    } catch (error) {
      console.error('❌ Stripe webhook handling failed:', error);
      return {
        success: false,
        message: 'Webhook processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle successful payment intent
   */
  private handlePaymentIntentSucceeded(paymentIntent: any): WebhookHandlerResult {
    const bookingId = paymentIntent.metadata?.booking_id;
    const creditsUsed = paymentIntent.metadata?.credits_used || 0;

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
      message: 'Payment succeeded'
    };
  }

  /**
   * Handle failed payment intent
   */
  private handlePaymentIntentFailed(paymentIntent: any): WebhookHandlerResult {
    const bookingId = paymentIntent.metadata?.booking_id;

    return {
      success: false,
      bookingId,
      message: 'Payment failed',
      error: paymentIntent.last_payment_error?.message || 'Payment failed'
    };
  }

  /**
   * Verify Stripe webhook signature
   */
  verifySignature(signature: string, body: string, secret: string): boolean {
    try {
      if (!secret) {
        console.warn('Stripe webhook secret not configured');
        return false;
      }

      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha256', secret)
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
    return `Stripe (${this.currency})`;
  }

  /**
   * Build split (async wrapper)
   */
  async buildSplit(config: PaymentConfig): Promise<any> {
    // For Stripe, split handling is different
    // We use transfers after payment
    return {
      amount: this.toSmallestUnit(config.amount),
      currency: this.currency.toLowerCase(),
      type: 'transfer'
    };
  }
}

export default StripeProcessor;

