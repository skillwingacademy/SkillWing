const PaymentService = require('../services/payment/PaymentService');
const { createClassroom } = require('../services/ClassroomService');
const Course = require('../models/Course');
const User = require('../models/User');
const Classroom = require('../models/Classroom');

// @desc    Create a payment order (works for mock + Razorpay)
// @route   POST /api/payments/create-order
// @access  Private (student)
const createOrder = async (req, res) => {
  try {
    const { courseId, purchasedTier, selectedCurrency } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required',
      });
    }

    if (!purchasedTier || !['1-on-1', 'Double', 'Batch'].includes(purchasedTier)) {
      return res.status(400).json({
        success: false,
        message: 'Valid purchasedTier is required (1-on-1, Double, or Batch)',
      });
    }

    // Check course exists and is active
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    if (!course.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This course is not currently available for enrollment',
      });
    }

    // Check if student is already enrolled in an active classroom for this course
    const existingEnrollment = await Classroom.findOne({
      course: courseId,
      enrolledStudents: req.user.id,
      status: { $in: ['active', 'paused'] },
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course',
      });
    }

    const { durationMonths } = req.body;

    // Determine the price based on tier and selected currency
    const validCurrency = ['INR', 'USD'].includes(selectedCurrency) ? selectedCurrency : 'INR';
    const currencyPricing = course.pricing?.[validCurrency.toLowerCase()] || {};

    const tierPriceMap = {
      '1-on-1': currencyPricing.oneOnOne,
      'Double': currencyPricing.double,
      'Batch': currencyPricing.batch,
    };

    let monthlyPrice = tierPriceMap[purchasedTier];

    // Fallback to legacy price field if pricing tiers are not set
    if (monthlyPrice === undefined || monthlyPrice === null) {
      monthlyPrice = course.price || 0;
    }

    const duration = [1, 3, 6, 9].includes(Number(durationMonths)) ? Number(durationMonths) : 1;
    const discounts = course.pricing?.discounts || {};
    let discountPercent = 0;
    if (duration === 3) discountPercent = discounts.month3 || 0;
    if (duration === 6) discountPercent = discounts.month6 || 0;
    if (duration === 9) discountPercent = discounts.month9 || 0;

    const originalTotal = monthlyPrice * duration;
    const discountAmount = Math.round(originalTotal * (discountPercent / 100));
    const finalPrice = Math.max(0, originalTotal - discountAmount);

    // Override the course price temporarily for the payment provider
    const courseForPayment = {
      ...course.toObject(),
      price: finalPrice,
      currency: validCurrency,
    };

    // Create order via the active payment provider
    const provider = PaymentService.getProvider();
    const user = await User.findById(req.user.id);
    const order = await provider.createOrder(courseForPayment, user);

    res.status(200).json({
      success: true,
      data: {
        ...order,
        courseId: courseId.toString(),
        courseTitle: course.title,
        purchasedTier,
        key: PaymentService.isMock() ? 'mock_key' : process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error('CreateOrder error:', error.error || error);
    res.status(500).json({
      success: false,
      message: 'Server error creating payment order',
    });
  }
};

// @desc    Verify payment and enroll student
// @route   POST /api/payments/verify
// @access  Private (student)
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId, purchasedTier } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required',
      });
    }

    const tier = purchasedTier || '1-on-1'; // fallback for backward compat

    const provider = PaymentService.getProvider();
    const result = await provider.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!result.verified) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Signature mismatch.',
      });
    }

    // Enroll the student (legacy — preserved for backward compatibility)
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { enrolledCourses: courseId },
    });

    // Create or join a Classroom (new source of truth)
    const classroom = await createClassroom(req.user.id, courseId, tier, {
      paymentId: result.paymentId,
      orderId: result.orderId,
      provider: 'razorpay',
      amount: req.body.amount || 0,
    });

    // console.log(
    //   `[Payment] Enrollment successful: User ${req.user.id} → Course ${courseId} | Tier: ${tier} | Payment: ${result.paymentId} | Classroom: ${classroom._id}`
    // );

    res.status(200).json({
      success: true,
      message: 'Payment verified and enrollment successful',
      data: {
        paymentId: result.paymentId,
        orderId: result.orderId,
        classroomId: classroom._id,
      },
    });
  } catch (error) {
    console.error('VerifyPayment error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error verifying payment',
    });
  }
};

module.exports = { createOrder, verifyPayment };
