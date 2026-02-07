import crypto from 'crypto';

export const verifyWebhookSignature = (req, res, next) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    console.error('GITHUB_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    return res.status(400).json({ error: 'Missing raw body for signature verification' });
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const trusted = Buffer.from(expected, 'ascii');
  const received = Buffer.from(signature, 'ascii');

  if (trusted.length !== received.length || !crypto.timingSafeEqual(trusted, received)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
};
