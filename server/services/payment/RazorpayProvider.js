/**
 * RazorpayProvider — Real Razorpay integration.
 * Used when PAYMENT_MODE is 'razorpay-test' or 'production'.
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayProvider {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  /**
   * Create a Razorpay order.
   * @param {Object} course  — Mongoose course document
   * @param {Object} user    — Mongoose user document (req.user)
   * @returns {Object} Razorpay order
   */
  async createOrder(course, user) {
    const options = {
      amount: Math.round(course.price * 100), // convert rupees/dollars to paise/cents
      currency: (course.currency || 'INR').toUpperCase(),
      receipt: `rcpt_${user._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        courseId: course._id.toString(),
        userId: user._id.toString(),
        courseTitle: course.title.substring(0, 250),
      },
    };

    const order = await this.razorpay.orders.create(options);

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      mock: false,
    };
  }

  /**
   * Verify Razorpay payment signature using HMAC SHA256.
   * @param {{ razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string }} paymentData
   * @returns {{ verified: boolean, paymentId: string, orderId: string }}
   */
  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const verified = expectedSignature === razorpay_signature;

    return {
      verified,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    };
  }
}

module.exports = RazorpayProvider;
