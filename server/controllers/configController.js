const geoip = require('geoip-lite');

const detectLocation = (req, res) => {
  let ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
             || req.connection?.remoteAddress || '';
  
  // Localhost / development fallback → default to India
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.')) {
    return res.json({ success: true, data: { country: 'IN', currency: 'INR', symbol: '₹' } });
  }

  const geo = geoip.lookup(ip);
  const isIndia = geo?.country === 'IN';

  res.json({
    success: true,
    data: {
      country: geo?.country || 'US',
      currency: isIndia ? 'INR' : 'USD',
      symbol: isIndia ? '₹' : '$',
    },
  });
};

module.exports = { detectLocation };
