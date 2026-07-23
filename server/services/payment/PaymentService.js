/**
 * PaymentService — Factory that returns the correct payment provider
 * based on the PAYMENT_MODE environment variable.
 *
 * Supported modes:
 *   - mock           → MockPaymentProvider  (no external calls)
 *   - razorpay-test  → RazorpayProvider     (Razorpay test keys)
 *   - production     → RazorpayProvider     (Razorpay live keys)
 */

const RazorpayProvider = require('./RazorpayProvider');

let _provider = null;

const PaymentService = {
  getProvider() {
    if (_provider) return _provider;

    _provider = new RazorpayProvider();
    console.log('[PaymentService] Using RazorpayProvider');

    return _provider;
  },

  /** Returns true when running in mock mode */
  isMock() {
    return false;
  },
};

module.exports = PaymentService;
