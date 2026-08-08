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
const MockPaymentProvider = require('./MockPaymentProvider');

let _provider = null;

const PaymentService = {
  getProvider() {
    if (_provider) return _provider;

    const mode = (process.env.PAYMENT_MODE || 'mock').trim().toLowerCase();

    if (mode === 'mock') {
      _provider = new MockPaymentProvider();
      console.log('[PaymentService] Using MockPaymentProvider');
    } else {
      _provider = new RazorpayProvider();
      console.log(`[PaymentService] Using RazorpayProvider (mode=${mode})`);
    }

    return _provider;
  },

  /** Returns true when running in mock mode */
  isMock() {
    return (process.env.PAYMENT_MODE || 'mock').trim().toLowerCase() === 'mock';
  },
};

module.exports = PaymentService;
