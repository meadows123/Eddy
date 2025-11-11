/**
 * Credit Purchase Helper for Paystack
 * Handles credit purchase flows with 10% platform commission
 */

import { buildPaystackPayload, ngnToKobo, calculateFees, formatCurrency } from './paystackHelper';

/**
 * Credit packages available for purchase
 */
export const creditPackages = [
  {
    id: 'pkg-50',
    credits: 50,
    priceNgn: 2500,
    pricePerCredit: 50,
    discount: 0,
    badge: 'Standard'
  },
  {
    id: 'pkg-100',
    credits: 100,
    priceNgn: 4500,
    pricePerCredit: 45,
    discount: 10,
    badge: 'Popular'
  },
  {
    id: 'pkg-250',
    credits: 250,
    priceNgn: 11250,
    pricePerCredit: 45,
    discount: 10,
    badge: 'Better Value'
  },
  {
    id: 'pkg-500',
    credits: 500,
    priceNgn: 20000,
    pricePerCredit: 40,
    discount: 20,
    badge: 'Best Value'
  }
];

/**
 * Platform commission percentage for credit purchases
 */
export const CREDIT_PURCHASE_COMMISSION = 10; // 10%

/**
 * Get credit package by ID
 * @param {string} packageId - Package ID to retrieve
 * @returns {Object|null} - Credit package or null if not found
 */
export const getCreditsPackage = (packageId) => {
  return creditPackages.find(pkg => pkg.id === packageId) || null;
};

/**
 * Calculate credit purchase split breakdown
 * @param {number} amount - Amount in NGN
 * @returns {Object} - Commission breakdown
 */
export const calculateCreditCommission = (amount) => {
  const fees = calculateFees(amount, CREDIT_PURCHASE_COMMISSION);
  
  return {
    totalAmount: amount,
    platformCommission: fees.platformFee,
    venueCommission: fees.venueAmount,
    platformPercentage: CREDIT_PURCHASE_COMMISSION,
    venuePercentage: 100 - CREDIT_PURCHASE_COMMISSION,
    breakdown: {
      platform: {
        amount: fees.platformFee,
        percentage: CREDIT_PURCHASE_COMMISSION,
        label: 'Platform Commission'
      },
      venue: {
        amount: fees.venueAmount,
        percentage: 100 - CREDIT_PURCHASE_COMMISSION,
        label: 'Venue Earns'
      }
    }
  };
};

/**
 * Build Paystack payload for credit purchase
 * @param {Object} params - Payment parameters
 * @returns {Object} - Paystack initialization payload
 */
export const buildCreditPurchasePayload = ({
  email,
  packageId,
  venueSubaccountId,
  platformSubaccountId,
  reference,
  metadata = {}
}) => {
  if (!email) throw new Error('Email is required');
  if (!packageId) throw new Error('Package ID is required');
  if (!venueSubaccountId) throw new Error('Venue subaccount ID is required');
  if (!platformSubaccountId) throw new Error('Platform subaccount ID is required');
  if (!reference) throw new Error('Reference is required');

  const creditPackage = getCreditsPackage(packageId);
  if (!creditPackage) {
    throw new Error(`Credit package not found: ${packageId}`);
  }

  // Build split payload
  const payload = buildPaystackPayload({
    email,
    amount: creditPackage.priceNgn,
    reference,
    mainAccountSubaccountId: platformSubaccountId,
    singleVenueSubaccountId: venueSubaccountId,
    platformFeePercentage: CREDIT_PURCHASE_COMMISSION,
    metadata: {
      ...metadata,
      transaction_type: 'credit_purchase',
      credits_amount: creditPackage.credits,
      package_id: packageId,
      price_per_credit: creditPackage.pricePerCredit
    }
  });

  return payload;
};

/**
 * Calculate display information for credit package
 * @param {string} packageId - Package ID
 * @returns {Object} - Display information
 */
export const getCreditPackageDisplay = (packageId) => {
  const pkg = getCreditsPackage(packageId);
  if (!pkg) return null;

  const commission = calculateCreditCommission(pkg.priceNgn);

  return {
    packageId: pkg.id,
    credits: pkg.credits,
    totalPrice: pkg.priceNgn,
    pricePerCredit: pkg.pricePerCredit,
    discount: pkg.discount,
    badge: pkg.badge,
    formattedPrice: formatCurrency(pkg.priceNgn),
    formattedPricePerCredit: formatCurrency(pkg.pricePerCredit),
    commission: {
      platformEarns: commission.platformCommission,
      formattedPlatformEarns: formatCurrency(commission.platformCommission),
      venueEarns: commission.venueCommission,
      formattedVenueEarns: formatCurrency(commission.venueCommission)
    },
    savingsVsBase: pkg.discount > 0 ? `Save ${pkg.discount}%` : null
  };
};

/**
 * Format all credit packages for UI display
 * @returns {Array} - Formatted packages
 */
export const getFormattedCreditsPackages = () => {
  return creditPackages.map(pkg => getCreditPackageDisplay(pkg.id));
};

/**
 * Calculate credit value at 1:1 ratio
 * @param {number} credits - Number of credits
 * @returns {number} - Value in NGN (1 credit = ₦1)
 */
export const creditValue = (credits) => {
  return credits; // 1:1 ratio
};

/**
 * Calculate how many credits customer can get with budget
 * @param {number} budgetNgn - Budget in NGN
 * @returns {Object} - Best package option and remaining budget
 */
export const findBestPackageForBudget = (budgetNgn) => {
  if (!budgetNgn || budgetNgn <= 0) {
    return { package: null, remainingBudget: budgetNgn };
  }

  // Find packages that fit within budget
  const affordable = creditPackages.filter(pkg => pkg.priceNgn <= budgetNgn);
  
  if (affordable.length === 0) {
    return { package: null, remainingBudget: budgetNgn };
  }

  // Return highest value package within budget
  const best = affordable[affordable.length - 1];
  
  return {
    package: best,
    remainingBudget: budgetNgn - best.priceNgn,
    savings: best.discount
  };
};

/**
 * Validate credit purchase request
 * @param {Object} purchaseData - Purchase data to validate
 * @returns {Object} - Validation result {isValid, errors}
 */
export const validateCreditPurchase = (purchaseData) => {
  const errors = [];

  if (!purchaseData.email || !purchaseData.email.includes('@')) {
    errors.push('Valid email is required');
  }

  if (!purchaseData.packageId) {
    errors.push('Package ID is required');
  } else if (!getCreditsPackage(purchaseData.packageId)) {
    errors.push('Invalid package ID');
  }

  if (!purchaseData.venueSubaccountId) {
    errors.push('Venue subaccount is required');
  }

  if (!purchaseData.platformSubaccountId) {
    errors.push('Platform subaccount is required');
  }

  if (!purchaseData.reference) {
    errors.push('Reference is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generate credit purchase reference
 * @param {string} venueId - Venue ID
 * @param {string} userId - User ID
 * @returns {string} - Unique reference
 */
export const generateCreditReference = (venueId, userId) => {
  const timestamp = Date.now();
  return `credit-${venueId}-${userId}-${timestamp}`;
};

/**
 * Format credit transaction for display
 * @param {Object} transaction - Credit transaction
 * @returns {Object} - Formatted display
 */
export const formatCreditTransaction = (transaction) => {
  const creditsDisplay = `${transaction.credits_used} credits`;
  
  return {
    id: transaction.id,
    type: transaction.transaction_type,
    credits: transaction.credits_used,
    creditsDisplay,
    description: transaction.description || `${creditsDisplay} ${transaction.transaction_type}`,
    date: new Date(transaction.created_at).toLocaleDateString('en-NG'),
    time: new Date(transaction.created_at).toLocaleTimeString('en-NG')
  };
};

/**
 * Calculate credit balance after transaction
 * @param {number} currentBalance - Current credit balance
 * @param {number} creditsToUse - Credits to use
 * @returns {Object} - New balance info
 */
export const calculateCreditBalance = (currentBalance, creditsToUse) => {
  if (creditsToUse > currentBalance) {
    return {
      sufficient: false,
      shortfall: creditsToUse - currentBalance,
      message: `You need ${creditsToUse - currentBalance} more credits`
    };
  }

  return {
    sufficient: true,
    newBalance: currentBalance - creditsToUse,
    creditsUsed: creditsToUse,
    message: `Balance: ${currentBalance - creditsToUse} credits remaining`
  };
};

/**
 * Get credit package recommendation based on usage
 * @param {number} estimatedMonthlyBookings - Estimated bookings per month
 * @returns {Object} - Recommended package
 */
export const getRecommendedPackage = (estimatedMonthlyBookings = 1) => {
  // Assume 50-100 credits per booking on average
  const estimatedCreditsNeeded = estimatedMonthlyBookings * 75;
  
  let recommended = creditPackages[0];
  
  if (estimatedCreditsNeeded > 250) {
    recommended = creditPackages[creditPackages.length - 1];
  } else if (estimatedCreditsNeeded > 100) {
    recommended = creditPackages[2];
  } else if (estimatedCreditsNeeded > 50) {
    recommended = creditPackages[1];
  }

  return {
    recommendation: recommended,
    estimatedCreditsNeeded,
    message: `For ${estimatedMonthlyBookings} bookings/month, we recommend ${recommended.credits} credits`
  };
};

export default {
  creditPackages,
  CREDIT_PURCHASE_COMMISSION,
  getCreditsPackage,
  calculateCreditCommission,
  buildCreditPurchasePayload,
  getCreditPackageDisplay,
  getFormattedCreditsPackages,
  creditValue,
  findBestPackageForBudget,
  validateCreditPurchase,
  generateCreditReference,
  formatCreditTransaction,
  calculateCreditBalance,
  getRecommendedPackage
};

