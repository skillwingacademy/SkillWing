const nodemailer = require("nodemailer");

/**
 * Send transactional email via SMTP
 *
 * @param {{
 *   email: string,
 *   subject: string,
 *   html: string,
 *   text?: string
 * }}
 * @returns {Promise<Object>}
 */
const sendEmail = (options) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Connect using the SMTP hostname directly. Forcing an IPv4 A-record
      // lookup breaks on IPv6/NAT64 networks (unroutable raw IPv4 address);
      // the resolver picks the right route when we pass the hostname through.
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,

        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },

        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
      });

      await transporter.verify();
      console.log("✅ SMTP connection verified");

      const info = await transporter.sendMail({
        from: `"SkillWing" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.text || "",
        html: options.html,
      });

      console.log("✅ Email sent:", info.messageId);
      resolve(info);
    } catch (err) {
      console.error("========== SMTP ERROR ==========");
      console.error(err);
      console.error("================================");
      reject(err);
    }
  });
};

module.exports = sendEmail;