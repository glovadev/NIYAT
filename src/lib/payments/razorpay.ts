/**
 * Razorpay Client SDK Utility for NIYAT E-Commerce
 */

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler?: (response: RazorpaySuccessResponse) => void;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailureResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: {
      order_id: string;
      payment_id: string;
    };
  };
}

/**
 * Dynamically loads the Razorpay standard checkout script (checkout.js).
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      return resolve(false);
    }

    // Already loaded
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      return resolve(true);
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn("Failed to load Razorpay checkout script.");
      resolve(false);
    };

    document.body.appendChild(script);
  });
}

/**
 * Checks if the configured Razorpay Key ID is an active real/test key or a placeholder.
 */
export function isRealRazorpayKey(keyId?: string): boolean {
  if (!keyId) return false;
  const trimmed = keyId.trim().toLowerCase();
  if (trimmed.includes("placeholder") || trimmed === "rzp_test_placeholder") {
    return false;
  }
  return trimmed.startsWith("rzp_test_") || trimmed.startsWith("rzp_live_");
}
