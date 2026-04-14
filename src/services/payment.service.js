const crypto = require("crypto");
const Razorpay = require("razorpay");

// ✅ env.js nahi hai — directly process.env use karo
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createRazorpayOrder = async ({ amount, currency = "INR", receipt }) => {
  return await razorpay.orders.create({
    amount,
    currency,
    receipt,
    payment_capture: 1,
  });
};

const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
};

const verifyWebhookSignature = (rawBody, receivedSig) => {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(receivedSig)
  );
};

module.exports = { createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature };