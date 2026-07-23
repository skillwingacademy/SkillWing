/**
 * MockPaymentProvider — Simulates payment without contacting any external service.
 * Used during development when PAYMENT_MODE=mock.
 */

const crypto = require('crypto');

class MockPaymentProvider {
  /**
   * Create a fake order that mimics Razorpay's order shape.
   * @param {Object} course  — Mongoose course document
   * @param {Object} user    — Mongoose user document (req.user)
   * @returns {Object} order data
   */
  async createOrder(course, user) {
    const orderId = 'mock_order_' + crypto.randomBytes(12).toString('hex');
    const amount = course.price; // already in paise

    return {
      id: orderId,
      amount,
      currency: (course.currency || 'INR').toUpperCase(),
      receipt: `receipt_${course._id}_${user._id}`,
      status: 'created',
      mock: true, // signal to frontend that this is a mock order
    };
  }

  /**
   * Verify a mock payment — always succeeds.
   * @returns {{ verified: boolean, paymentId: string, orderId: string }}
   */
  async verifyPayment({ razorpay_order_id }) {
    return {
      verified: true,
      paymentId: 'mock_pay_' + crypto.randomBytes(12).toString('hex'),
      orderId: razorpay_order_id || 'mock_order_unknown',
    };
  }
}

module.exports = MockPaymentProvider;
