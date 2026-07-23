/**
 * buildOtpEmail — returns a branded HTML email containing a 6-digit OTP.
 * @param {string} name - User's name
 * @param {string} otp  - Plain 6-digit OTP to display
 * @param {string} [purpose='verify your email'] - Short purpose phrase
 * @returns {{ html: string, text: string }}
 */
const buildOtpEmail = (name, otp, purpose = 'verify your email') => {
  const digits = otp.split('').map(d =>
    `<span style="
      display:inline-block;
      width:44px; height:52px;
      line-height:52px;
      text-align:center;
      font-size:28px;
      font-weight:800;
      color:#1e40af;
      background:#eff6ff;
      border:2px solid #bfdbfe;
      border-radius:10px;
      margin:0 4px;
      font-family: 'Courier New', monospace;
    ">${d}</span>`
  ).join('');

  const year = new Date().getFullYear();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>SkillWing — Email Verification</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#bfdbfe;letter-spacing:2px;text-transform:uppercase;font-weight:700;">SkillWing Academy</p>
            <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Email Verification</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:36px 40px 28px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;">Hi ${name},</p>
            <p style="margin:14px 0 0;font-size:15px;color:#475569;line-height:1.7;">
              Use the code below to ${purpose}. This code is valid for <strong style="color:#1e293b;">10 minutes</strong>.
            </p>

            <!-- OTP Box -->
            <div style="text-align:center;margin:32px 0 28px;">
              ${digits}
            </div>

            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
              Enter this code on the verification screen. Do not share it with anyone.
            </p>
          </td>
        </tr>

        <!-- Security notice -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
            <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
              🛡️ <strong>Didn't request this?</strong> You can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              © ${year} SkillWing Academy. All rights reserved.<br/>
              Anandnagar, Giridih, Jharkhand — 815301, India
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hi ${name},\n\nYour SkillWing verification code is: ${otp}\n\nThis code is valid for 10 minutes. Do not share it with anyone.\n\nIf you did not request this, you can ignore this email.\n\nRegards,\nThe SkillWing Team`;

  return { html, text };
};

module.exports = buildOtpEmail;
