/**
 * Paystack Helper Utilities
 * Functions for handling payments with platform fees and splits
 */

/**
 * Calculate platform fee and venue owner amount
 * @param {number} totalAmount - Total amount in NGN
 * @param {number} platformFeePercentage - Platform fee percentage (e.g., 10 for 10%)
 * @returns {Object} - {totalAmount, platformFee, venueAmount}
 */
export const calculateFees = (totalAmount, platformFeePercentage = 10) => {
  if (!totalAmount || totalAmount <= 0) {
    throw new Error('Invalid total amount');
  }

  const platformFee = (totalAmount * platformFeePercentage) / 100;
  const venueAmount = totalAmount - platformFee;

  return {
    totalAmount,
    platformFeePercentage,
    platformFee: Math.round(platformFee),
    venueAmount: Math.round(venueAmount),
    platformFeePercentageCalculated: (platformFee / totalAmount) * 100
  };
};

/**
 * Build a Paystack split configuration for a single payment
 * Takes fee first, then splits remainder to venue
 * @param {string} mainAccountSubaccountId - Platform's subaccount ID (or null for main)
 * @param {string} venueSubaccountId - Venue owner's subaccount ID
 * @param {number} totalAmount - Total amount in NGN
 * @param {number} platformFeePercentage - Platform fee percentage
 * @returns {Object} - Paystack split payload
 */
export const buildSinglePaymentSplit = (
  mainAccountSubaccountId,
  venueSubaccountId,
  totalAmount,
  platformFeePercentage = 10
) => {
  if (!venueSubaccountId) {
    throw new Error('Venue subaccount ID is required');
  }

  const fees = calculateFees(totalAmount, platformFeePercentage);

  const subaccounts = [];

  // Add main account (platform fee)
  if (mainAccountSubaccountId) {
    subaccounts.push({
      subaccount: mainAccountSubaccountId,
      share: platformFeePercentage
    });
  }

  // Add venue owner (remainder)
  subaccounts.push({
    subaccount: venueSubaccountId,
    share: 100 - platformFeePercentage
  });

  return {
    type: 'percentage',
    subaccounts: subaccounts,
    fees: fees
  };
};

/**
 * Build a Paystack split configuration for split payments
 * Takes fee first, then splits remainder among venues
 * @param {string} mainAccountSubaccountId - Platform's subaccount ID (or null for main)
 * @param {Array} venueShares - Array of {venueSubaccountId, percentage}
 * @param {number} totalAmount - Total amount in NGN
 * @param {number} platformFeePercentage - Platform fee percentage
 * @returns {Object} - Paystack split payload
 */
export const buildSplitPaymentSplit = (
  mainAccountSubaccountId,
  venueShares,
  totalAmount,
  platformFeePercentage = 10
) => {
  if (!venueShares || venueShares.length === 0) {
    throw new Error('At least one venue is required for split payment');
  }

  // Validate venue shares add up to 100%
  const venueShareTotal = venueShares.reduce((sum, vs) => sum + vs.percentage, 0);
  if (venueShareTotal <= 0 || venueShareTotal > 100) {
    throw new Error(`Venue shares must total 100%, got ${venueShareTotal}%`);
  }

  const remainingPercentage = 100 - platformFeePercentage;
  
  // Calculate actual percentage for each venue after platform fee is deducted
  const adjustedVenueShares = venueShares.map(vs => ({
    ...vs,
    adjustedPercentage: (vs.percentage / venueShareTotal) * remainingPercentage
  }));

  const subaccounts = [];

  // Add main account (platform fee)
  if (mainAccountSubaccountId) {
    subaccounts.push({
      subaccount: mainAccountSubaccountId,
      share: platformFeePercentage
    });
  }

  // Add venues with adjusted percentages
  adjustedVenueShares.forEach(vs => {
    subaccounts.push({
      subaccount: vs.venueSubaccountId,
      share: vs.adjustedPercentage
    });
  });

  const fees = calculateFees(totalAmount, platformFeePercentage);

  return {
    type: 'percentage',
    subaccounts: subaccounts,
    fees: fees,
    venueShares: venueShares,
    adjustedVenueShares: adjustedVenueShares
  };
};

/**
 * Convert NGN to Kobo (Paystack uses kobo)
 * @param {number} ngnAmount - Amount in NGN
 * @returns {number} - Amount in kobo
 */
export const ngnToKobo = (ngnAmount) => {
  if (!ngnAmount || ngnAmount <= 0) {
    throw new Error('Invalid NGN amount');
  }
  return Math.round(ngnAmount * 100);
};

/**
 * Convert Kobo to NGN
 * @param {number} koboAmount - Amount in kobo
 * @returns {number} - Amount in NGN
 */
export const koboToNgn = (koboAmount) => {
  if (!koboAmount || koboAmount <= 0) {
    throw new Error('Invalid kobo amount');
  }
  return Math.round(koboAmount / 100);
};

/**
 * Format currency for display
 * @param {number} amount - Amount in NGN
 * @param {string} currency - Currency code (default: NGN)
 * @returns {string} - Formatted string (e.g., "₦100,000")
 */
export const formatCurrency = (amount, currency = 'NGN') => {
  if (!amount && amount !== 0) return 'N/A';
  
  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return formatter.format(amount);
};

/**
 * Validate Paystack subaccount ID format
 * @param {string} subaccountId - Subaccount ID to validate
 * @returns {boolean} - True if valid format
 */
export const isValidSubaccountId = (subaccountId) => {
  if (!subaccountId || typeof subaccountId !== 'string') return false;
  // Paystack subaccount IDs typically start with 'acct_'
  return /^acct_[a-zA-Z0-9]+$/.test(subaccountId);
};

/**
 * Build complete Paystack payment payload
 * @param {Object} params - Payment parameters
 * @returns {Object} - Complete Paystack initialization payload
 */
export const buildPaystackPayload = ({
  email,
  amount, // in NGN
  reference,
  mainAccountSubaccountId,
  venueShares, // for split payments: [{venueSubaccountId, percentage}, ...]
  singleVenueSubaccountId, // for single payments
  platformFeePercentage = 10,
  metadata = {}
}) => {
  if (!email) throw new Error('Email is required');
  if (!amount || amount <= 0) throw new Error('Invalid amount');
  if (!reference) throw new Error('Reference is required');

  const amountInKobo = ngnToKobo(amount);

  let split;

  if (venueShares && venueShares.length > 0) {
    // Split payment
    split = buildSplitPaymentSplit(
      mainAccountSubaccountId,
      venueShares,
      amount,
      platformFeePercentage
    );
  } else if (singleVenueSubaccountId) {
    // Single payment
    split = buildSinglePaymentSplit(
      mainAccountSubaccountId,
      singleVenueSubaccountId,
      amount,
      platformFeePercentage
    );
  } else {
    throw new Error('Either venueShares or singleVenueSubaccountId is required');
  }

  return {
    email,
    amount: amountInKobo,
    reference,
    split: split.subaccounts,
    metadata: {
      ...metadata,
      platform_fee_percentage: platformFeePercentage,
      platform_fee_amount: split.fees.platformFee,
      venue_amount: split.fees.venueAmount
    }
  };
};

/**
 * Calculate what each party receives
 * Useful for UI display and confirmation
 * @param {number} totalAmount - Total amount in NGN
 * @param {number} platformFeePercentage - Platform fee percentage
 * @param {Array} venueShares - Venue split percentages
 * @returns {Object} - Breakdown of amounts
 */
export const calculatePaymentBreakdown = (
  totalAmount,
  platformFeePercentage = 10,
  venueShares = []
) => {
  const fees = calculateFees(totalAmount, platformFeePercentage);
  const remainingPercentage = 100 - platformFeePercentage;

  if (venueShares.length === 0) {
    // Single payment
    return {
      totalAmount,
      platformFee: fees.platformFee,
      venueAmount: fees.venueAmount,
      breakdown: [
        { recipient: 'Platform', amount: fees.platformFee, percentage: platformFeePercentage },
        { recipient: 'Venue', amount: fees.venueAmount, percentage: remainingPercentage }
      ]
    };
  }

  // Split payment
  const venueShareTotal = venueShares.reduce((sum, vs) => sum + vs.percentage, 0);
  const venueBreakdown = venueShares.map(vs => ({
    ...vs,
    amount: Math.round((vs.percentage / venueShareTotal) * fees.venueAmount),
    actualPercentage: (vs.percentage / venueShareTotal) * remainingPercentage
  }));

  return {
    totalAmount,
    platformFee: fees.platformFee,
    venueAmount: fees.venueAmount,
    breakdown: [
      { recipient: 'Platform', amount: fees.platformFee, percentage: platformFeePercentage },
      ...venueBreakdown.map(v => ({
        recipient: `${v.venueName || 'Venue'}`,
        amount: v.amount,
        percentage: v.actualPercentage
      }))
    ]
  };
};

export default {
  calculateFees,
  buildSinglePaymentSplit,
  buildSplitPaymentSplit,
  ngnToKobo,
  koboToNgn,
  formatCurrency,
  isValidSubaccountId,
  buildPaystackPayload,
  calculatePaymentBreakdown
};

