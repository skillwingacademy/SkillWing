const nodemailer = require("nodemailer");
const dns = require("dns").promises;

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
      // Resolve IPv4 address
      const { address } = await dns.lookup(process.env.SMTP_HOST, {
        family: 4,
      });

      console.log("========== SMTP DEBUG ==========");
      console.log({
        smtpHost: process.env.SMTP_HOST,
        resolvedIPv4: address,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        secure: Number(process.env.SMTP_PORT) === 465,
      });
      console.log("===============================");

      const transporter = nodemailer.createTransport({
        host: address,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,

        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },

        tls: {
          servername: process.env.SMTP_HOST,
        },

        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,

        logger: true,
        debug: true,
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