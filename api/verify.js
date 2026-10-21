const Razorpay = require('razorpay');

function parseJsonBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }
  return body;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseJsonBody(req.body);
    const paymentId = String(body.payment_id || '').trim();

    if (!paymentId) {
      return res.status(400).json({ error: 'payment_id is required.' });
    }

    const hasRazorpayKeys = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    const minAmountPaise = Number(process.env.MIN_AMOUNT_PAISE || 9900);

    if (!hasRazorpayKeys) {
      if (paymentId.startsWith('pay_') || paymentId.startsWith('demo_')) {
        return res.status(200).json({ verified: true, ok: true, demo: true, amount: minAmountPaise });
      }
      return res.status(401).json({ error: 'Razorpay credentials are not configured.' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const payment = await razorpay.payments.fetch(paymentId);
    const amountPaise = Number(payment.amount || 0);

    if (payment.status !== 'captured') {
      return res.status(402).json({ error: 'Payment has not been captured.', verified: false });
    }

    if (amountPaise < minAmountPaise) {
      return res.status(402).json({ error: 'Payment amount is below the minimum required.', verified: false });
    }

    return res.status(200).json({
      verified: true,
      ok: true,
      payment_id: paymentId,
      amount: amountPaise,
      currency: payment.currency || 'INR'
    });
  } catch (error) {
    console.error('Verification handler error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to verify payment.',
      verified: false
    });
  }
};
