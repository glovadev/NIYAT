import crypto from "crypto";

async function main() {
  console.log("--- 1. Testing POST /api/create-order ---");
  const createRes = await fetch("http://localhost:3000/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: 79900,
      currency: "INR",
      receipt: `rcpt_test_${Date.now()}`,
      notes: { channel: "integration_test" },
    }),
  });

  const createData = await createRes.json();
  console.log("Create Order Response:", createRes.status, createData);

  if (!createData.order_id) {
    console.error("Order creation failed!");
    return;
  }

  const orderId = createData.order_id;
  const paymentId = `pay_test_${Date.now()}`;
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "AyDjzVkNWcrUWEreEnhFWl0s";

  // Compute expected HMAC SHA-256 signature
  const validSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  console.log("\n--- 2. Testing POST /api/verify-payment (Valid Signature) ---");
  const verifyRes = await fetch("http://localhost:3000/api/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
    }),
  });

  const verifyData = await verifyRes.json();
  console.log("Verify Valid Signature Response:", verifyRes.status, verifyData);

  console.log("\n--- 3. Testing POST /api/verify-payment (Tampered Signature) ---");
  const failRes = await fetch("http://localhost:3000/api/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: "tampered_fake_signature_abc123",
    }),
  });

  const failData = await failRes.json();
  console.log("Verify Tampered Signature Response:", failRes.status, failData);

  console.log("\n--- 4. Testing Minimum Amount Error (< 100 paise) ---");
  const minRes = await fetch("http://localhost:3000/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: 50, // 50 paise is < 100
      currency: "INR",
    }),
  });

  const minData = await minRes.json();
  console.log("Min Amount Check Response:", minRes.status, minData);
}

main().catch(console.error);
