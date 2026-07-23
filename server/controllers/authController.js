const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, role, phoneNumber, state, intendedCourse, dob } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const validRole = role && ['student', 'teacher'].includes(role) ? role : 'student';

    // Phone number is required for both students and teachers
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // ── Uniqueness checks (run in parallel for speed) ─────────────────
    const cleanPhone = phoneNumber.trim();
    const cleanEmail = email.trim().toLowerCase();

    const [
      userByEmail,
      userByPhone,
    ] = await Promise.all([
      User.findOne({ email: cleanEmail }).lean(),
      User.findOne({ $or: [{ phoneNumber: cleanPhone }, { 'profile.phoneNumber': cleanPhone }] }).lean(),
    ]);

    if (userByEmail) {
      return res.status(400).json({ success: false, message: 'An account with this email is already registered.' });
    }
    if (userByPhone) {
      return res.status(400).json({ success: false, message: 'An account with this phone number is already registered.' });
    }

    const approvalStatus = validRole === 'teacher' ? 'pending' : 'approved';
    const sanitizedCourse = intendedCourse && intendedCourse.trim() ? intendedCourse.trim() : undefined;
    const sanitizedDob    = dob && dob.trim() ? dob.trim() : undefined;

    // Create user
    const user = await User.create({
      name,
      email: cleanEmail,
      password,
      role: validRole,
      approvalStatus,
      phoneNumber: cleanPhone,
      state,
      intendedCourse: sanitizedCourse,
      dob: sanitizedDob,
      isEmailVerified: false, // Or true, but left as false for when feature is added
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus,
          enrolledCourses: user.enrolledCourses,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @desc    Login user (by email or phone number)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide your email/phone and password' });
    }

    // Detect if input looks like a phone number (digits, +, spaces, dashes)
    const isPhone = /^[\d\s+\-()]{7,15}$/.test(emailOrPhone.trim());
    const query = isPhone
      ? { $or: [{ phoneNumber: emailOrPhone.trim() }, { 'profile.phoneNumber': emailOrPhone.trim() }] }
      : { email: emailOrPhone.trim().toLowerCase() };

    const user = await User.findOne(query).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Google-only accounts don't have a password
    if (!user.password) {
      return res.status(401).json({ success: false, message: 'This account uses Google sign-in. Please log in with Google.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus,
          enrolledCourses: user.enrolledCourses,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Google OAuth login/register
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential token is required',
      });
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Find existing user by googleId or email
    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (user) {
      if (!user.googleId) user.googleId = googleId;
      if (picture) user.avatar = picture;
      if (!user.isEmailVerified) user.isEmailVerified = true; // Google = verified
      await user.save();
    } else {
      user = await User.create({
        name, email, googleId, avatar: picture,
        role: 'student', isEmailVerified: true,
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus,
          enrolledCourses: user.enrolledCourses,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error('Google login error:', error.message);
    res.status(401).json({
      success: false,
      message: 'Invalid Google credential',
    });
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      'enrolledCourses',
      'title description price thumbnailImage educator isActive'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        enrolledCourses: user.enrolledCourses,
        avatar: user.avatar,
        profile: user.profile
      },
    });
  } catch (error) {
    console.error('GetMe error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user profile',
    });
  }
};

// @desc    Forgot password — generate token + send email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Generic response to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Generate raw token and its hashed version
    const rawToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const clientUrl = (process.env.CLIENT_URL || '').replace(/\/+$/, '');
    const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

    const htmlEmail = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your SkillWing password</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 16px 16px 0 0; padding: 36px 40px; text-align: center;">
              <p style="margin:0; font-size:13px; color:#bfdbfe; letter-spacing:2px; text-transform:uppercase; font-weight:600;">SkillWing Academy</p>
              <h1 style="margin: 8px 0 0; font-size:28px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">Password Reset</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff; padding: 40px 40px 32px; border-left:1px solid #e2e8f0; border-right:1px solid #e2e8f0;">
              <p style="margin:0 0 8px; font-size:22px; font-weight:700; color:#0f172a;">Hi ${user.name},</p>
              <p style="margin:16px 0 0; font-size:15px; color:#475569; line-height:1.7;">
                We received a request to reset the password for your SkillWing account associated with
                <strong style="color:#1e293b;">${user.email}</strong>.
              </p>
              <p style="margin:12px 0 0; font-size:15px; color:#475569; line-height:1.7;">
                Click the button below to choose a new password. This link is valid for
                <strong style="color:#1e293b;">15 minutes</strong>.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 36px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}"
                       target="_blank"
                       style="
                         display: inline-block;
                         background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                         color: #ffffff;
                         text-decoration: none;
                         font-size: 16px;
                         font-weight: 700;
                         padding: 16px 40px;
                         border-radius: 10px;
                         letter-spacing: 0.3px;
                         box-shadow: 0 4px 14px rgba(37,99,235,0.4);
                       ">
                      🔒 Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0; font-size:13px; color:#94a3b8; line-height:1.6;">
                Button not working? Copy and paste this link into your browser:
              </p>
              <p style="margin:6px 0 0; font-size:12px; word-break:break-all;">
                <a href="${resetUrl}" style="color:#2563eb; text-decoration:underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Security notice -->
          <tr>
            <td style="background:#f8fafc; padding: 24px 40px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
              <p style="margin:0; font-size:13px; color:#64748b; line-height:1.6;">
                🛡️ <strong>Didn't request this?</strong> You can safely ignore this email. Your password will not change unless you click the button above.
              </p>
              <p style="margin:10px 0 0; font-size:12px; color:#94a3b8;">
                For your security, this link expires in 15 minutes and can only be used once.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 28px 40px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#94a3b8; line-height:1.6;">
                © ${new Date().getFullYear()} SkillWing Academy. All rights reserved.<br/>
                Anandnagar, Giridih, Jharkhand — 815301, India
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const plainText = `Hi ${user.name},\n\nYou requested a password reset for your SkillWing account.\n\nReset your password here (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\nRegards,\nThe SkillWing Team`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'SkillWing — Password Reset Request',
        html: htmlEmail,
        text: plainText,
      });

      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    } catch (emailErr) {
      console.error('ForgotPassword email error:', emailErr.message);
      // Clear the token so user can try again
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.',
      });
    }
  } catch (error) {
    console.error('ForgotPassword error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Reset password using token
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Hash the incoming raw token to compare with DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired.',
      });
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('ResetPassword error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { register, login, googleLogin, getMe, forgotPassword, resetPassword };
