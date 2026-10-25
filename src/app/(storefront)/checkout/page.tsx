"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/lib/cart/cart-context";
import { useAuth } from "@/lib/auth/auth-context";
import { formatPaise } from "@/lib/utils";
import {
  ShieldCheck,
  CreditCard,
  Truck,
  CheckCircle2,
  Tag,
  AlertCircle,
  ChevronRight,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { RazorpayPaymentModal } from "@/components/checkout/RazorpayPaymentModal";
import { loadRazorpayScript, isRealRazorpayKey } from "@/lib/payments/razorpay";

interface SavedAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const { user, profile } = useAuth();

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");

  // Shipping Form State
  const [recipientName, setRecipientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Coupon & Payment
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"RAZORPAY" | "COD">("RAZORPAY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Active Payment Gateway Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activePaymentDetails, setActivePaymentDetails] = useState<{
    orderId: string;
    orderNumber: string;
    razorpayOrderId: string;
    amountPaise: number;
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    guestOrderToken?: string;
  } | null>(null);

  // Load saved addresses and pre-populate fields
  useEffect(() => {
    if (user) {
      if (profile?.name) setRecipientName(profile.name);
      if (user.email) setEmail(user.email);
      if (profile?.phone) setPhone(profile.phone);

      fetch("/api/me/addresses")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.items && data.data.items.length > 0) {
            setSavedAddresses(data.data.items);
            const defaultAddr =
              data.data.items.find((a: SavedAddress) => a.isDefault) || data.data.items[0];
            setSelectedAddressId(defaultAddr.id);
            populateAddressFields(defaultAddr);
          }
        })
        .catch(() => {});
    }
  }, [user, profile]);

  const populateAddressFields = (addr: SavedAddress) => {
    setRecipientName(addr.recipientName);
    setPhone(addr.phone);
    setAddressLine1(addr.addressLine1);
    setAddressLine2(addr.addressLine2 || "");
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
  };

  const handleAddressSelect = (addrId: string) => {
    setSelectedAddressId(addrId);
    if (addrId === "new") {
      setAddressLine1("");
      setAddressLine2("");
      setCity("");
      setState("");
      setPostalCode("");
    } else {
      const found = savedAddresses.find((a) => a.id === addrId);
      if (found) populateAddressFields(found);
    }
  };

  // Live Calculations (in integer paise)
  const subtotalPaise = items.reduce(
    (sum, item) => sum + item.regularPricePaise * item.quantity,
    0
  );
  const netAfterDiscount = Math.max(0, subtotalPaise - couponDiscount);
  const freeShippingThreshold = 99900; // ₹999
  const shippingFeePaise = netAfterDiscount >= freeShippingThreshold ? 0 : 9900; // ₹99
  const taxPaise = Math.round((netAfterDiscount * 18) / 118);
  const grandTotalPaise = netAfterDiscount + shippingFeePaise;

  // Coupon application
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setValidatingCoupon(true);
    setCouponMsg(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.valid) {
        setAppliedCoupon(data.data.code);
        setCouponDiscount(data.data.discountPaise);
        setCouponMsg({ text: `Coupon applied: ${formatPaise(data.data.discountPaise)} saved!`, isError: false });
      } else {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponMsg({
          text: data.data?.message || data.error?.message || "Invalid coupon code",
          isError: true,
        });
      }
    } catch {
      setCouponMsg({ text: "Failed to validate coupon", isError: true });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponMsg(null);
  };

  // Place Order Handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    setIsSubmitting(true);

    try {
      const orderPayload = {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: {
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          country: "IN",
        },
        customerEmail: email.trim() || undefined,
        couponCode: appliedCoupon || undefined,
        paymentMethod,
      };

      // 1. Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error?.message || "Failed to create order");
      }

      const { orderId, orderNumber, guestOrderToken } = orderData.data;

      // 2. Handle Payment
      if (paymentMethod === "COD") {
        clearCart();
        router.push(`/order-confirmation/${orderNumber}`);
        return;
      }

      // Online Razorpay Payment
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (guestOrderToken) {
        headers["x-guest-order-token"] = guestOrderToken;
      }

      const createPaymentRes = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers,
        body: JSON.stringify({ orderId }),
      });

      const paymentData = await createPaymentRes.json();
      if (!createPaymentRes.ok || !paymentData.success) {
        throw new Error(paymentData.error?.message || "Failed to initialize payment gateway");
      }

      const {
        razorpayOrderId,
        keyId,
        amountPaise,
        customerName: fetchedCustomerName,
        customerPhone: fetchedCustomerPhone,
        customerEmail: fetchedCustomerEmail,
      } = paymentData.data;

      // Check if real Razorpay Key is configured and script loads
      if (isRealRazorpayKey(keyId)) {
        const scriptLoaded = await loadRazorpayScript();
        const win = window as unknown as { Razorpay?: new (opts: unknown) => { open: () => void; on: (event: string, cb: (res: unknown) => void) => void } };

        if (scriptLoaded && win.Razorpay) {
          const rzp = new win.Razorpay({
            key: keyId,
            amount: amountPaise,
            currency: "INR",
            name: "NIYAT Luxury Skincare",
            description: `Order ${orderNumber} - Pure Botanical Formulations`,
            order_id: razorpayOrderId,
            prefill: {
              name: fetchedCustomerName || recipientName,
              email: fetchedCustomerEmail || email,
              contact: fetchedCustomerPhone || phone,
            },
            theme: {
              color: "#084C3E",
            },
            modal: {
              ondismiss: () => {
                setIsSubmitting(false);
                setOrderError(`Order ${orderNumber} is reserved. Complete payment whenever you are ready.`);
              },
            },
            handler: async (resp: {
              razorpay_payment_id: string;
              razorpay_order_id: string;
              razorpay_signature: string;
            }) => {
              await verifyAndCompleteOrder({
                orderId,
                orderNumber,
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
                guestOrderToken,
              });
            },
          });

          rzp.on("payment.failed", (resp: unknown) => {
            const errObj = resp as { error?: { description?: string } };
            setIsSubmitting(false);
            setOrderError(errObj?.error?.description || "Payment failed. Please retry.");
          });

          rzp.open();
          return;
        }
      }

      // If in sandbox mode or test placeholder, launch our interactive luxury gateway modal
      setActivePaymentDetails({
        orderId,
        orderNumber,
        razorpayOrderId,
        amountPaise,
        customerName: fetchedCustomerName || recipientName || "Patron",
        customerEmail: fetchedCustomerEmail || email,
        customerPhone: fetchedCustomerPhone || phone,
        guestOrderToken,
      });
      setPaymentModalOpen(true);
      setIsSubmitting(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete order";
      setOrderError(msg);
      setIsSubmitting(false);
    }
  };

  const verifyAndCompleteOrder = async ({
    orderId,
    orderNumber,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    guestOrderToken,
  }: {
    orderId: string;
    orderNumber: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    guestOrderToken?: string;
  }) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (guestOrderToken) {
      headers["x-guest-order-token"] = guestOrderToken;
    }

    const verifyRes = await fetch("/api/payments/razorpay/verify", {
      method: "POST",
      headers,
      body: JSON.stringify({
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      }),
    });

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.success) {
      throw new Error(verifyData.error?.message || "Payment verification failed");
    }

    setPaymentModalOpen(false);
    clearCart();
    router.push(`/order-confirmation/${orderNumber}`);
  };

  if (items.length === 0) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4 px-4">
        <div className="w-16 h-16 rounded-full bg-white border border-niyat-ivory-border flex items-center justify-center mx-auto text-niyat-gold shadow-sm">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-niyat-charcoal">
          Your Bag is Empty
        </h2>
        <p className="text-xs text-niyat-muted">
          Add your chosen botanical treatments to your shopping bag before proceeding to checkout.
        </p>
        <div className="pt-2">
          <Link
            href="/shop"
            className="inline-block px-7 py-3 rounded-full bg-niyat-emerald text-white text-xs font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark transition-all"
          >
            Explore Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-niyat-muted">
          <Link href="/" className="hover:text-niyat-emerald transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/shop" className="hover:text-niyat-emerald transition-colors">
            Shop
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-niyat-charcoal font-medium">Checkout</span>
        </nav>

        <div className="border-b border-niyat-ivory-border pb-4">
          <span className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
            Secure Transaction
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-niyat-charcoal mt-1">
            Order Checkout
          </h1>
        </div>

        {orderError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{orderError}</span>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* =============================================================== */}
          {/* LEFT: SHIPPING & PAYMENT DETAILS (7 Cols)                      */}
          {/* =============================================================== */}
          <div className="lg:col-span-7 space-y-8">
            {/* 1. Contact Information */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-niyat-ivory-border shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-niyat-ivory-border">
                <h3 className="font-serif text-lg font-bold text-niyat-charcoal">
                  1. Contact Information
                </h3>
                {!user && (
                  <span className="text-[11px] text-niyat-muted">
                    Checking out as Guest
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                    placeholder="Recipient's Name"
                    className="w-full px-4 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                    Mobile Number (For Delivery SMS)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs text-niyat-muted select-none">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                    Email Address (For Invoices &amp; Tracking Updates)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="customer@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                  />
                </div>
              </div>
            </div>

            {/* 2. Shipping Address */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-niyat-ivory-border shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-niyat-ivory-border">
                <h3 className="font-serif text-lg font-bold text-niyat-charcoal">
                  2. Delivery Address
                </h3>
              </div>

              {/* Saved Address Selector (if logged in and has addresses) */}
              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                    Select Address
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => handleAddressSelect(addr.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all text-xs ${
                          selectedAddressId === addr.id
                            ? "border-niyat-emerald bg-niyat-emerald/5 ring-1 ring-niyat-emerald"
                            : "border-niyat-ivory-border hover:border-niyat-gold"
                        }`}
                      >
                        <span className="font-bold text-niyat-charcoal block">
                          {addr.label}: {addr.recipientName}
                        </span>
                        <span className="text-niyat-muted text-[11px] block mt-0.5 line-clamp-1">
                          {addr.addressLine1}, {addr.city}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddressSelect("new")}
                      className={`p-3.5 rounded-2xl border text-left transition-all text-xs ${
                        selectedAddressId === "new"
                          ? "border-niyat-emerald bg-niyat-emerald/5 ring-1 ring-niyat-emerald"
                          : "border-niyat-ivory-border hover:border-niyat-gold"
                      }`}
                    >
                      <span className="font-bold text-niyat-charcoal block">
                        + Enter New Address
                      </span>
                      <span className="text-niyat-muted text-[11px] block mt-0.5">
                        Ship to another destination
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Address Form Fields */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                    Address Line 1 (Flat, House no., Building, Street)
                  </label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    required
                    placeholder="e.g. Flat 402, Lotus Heights, MG Road"
                    className="w-full px-4 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                    Address Line 2 (Area, Landmark, Optional)
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="e.g. Near Botanical Garden"
                    className="w-full px-4 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                      PIN Code
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      maxLength={6}
                      placeholder="781001"
                      className="w-full px-4 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      placeholder="City"
                      className="w-full px-4 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                      State
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                      placeholder="State"
                      className="w-full px-4 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Payment Method Selection */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-niyat-ivory-border shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-niyat-charcoal pb-3 border-b border-niyat-ivory-border">
                3. Payment Preference
              </h3>

              <div className="space-y-3">
                {/* Razorpay Online */}
                <label
                  className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "RAZORPAY"
                      ? "border-niyat-emerald bg-niyat-emerald/5 ring-1 ring-niyat-emerald"
                      : "border-niyat-ivory-border hover:border-niyat-gold"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="RAZORPAY"
                    checked={paymentMethod === "RAZORPAY"}
                    onChange={() => setPaymentMethod("RAZORPAY")}
                    className="mt-1 text-niyat-emerald focus:ring-niyat-gold"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-niyat-gold" />
                      <span className="font-semibold text-sm text-niyat-charcoal">
                        Online Payment (Razorpay)
                      </span>
                    </div>
                    <p className="text-xs text-niyat-muted">
                      UPI (Google Pay, PhonePe, Paytm), Credit &amp; Debit Cards, NetBanking, and Wallets.
                    </p>
                  </div>
                </label>

                {/* Cash on Delivery */}
                <label
                  className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "COD"
                      ? "border-niyat-emerald bg-niyat-emerald/5 ring-1 ring-niyat-emerald"
                      : "border-niyat-ivory-border hover:border-niyat-gold"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                    className="mt-1 text-niyat-emerald focus:ring-niyat-gold"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-niyat-gold" />
                      <span className="font-semibold text-sm text-niyat-charcoal">
                        Cash on Delivery (COD)
                      </span>
                    </div>
                    <p className="text-xs text-niyat-muted">
                      Pay with cash or UPI QR at your doorstep upon receiving the shipment.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* RIGHT: ORDER SUMMARY & TOTALS (5 Cols)                         */}
          {/* =============================================================== */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-niyat-ivory-border shadow-sm space-y-6 sticky top-28">
              <h3 className="font-serif text-xl font-bold text-niyat-charcoal pb-4 border-b border-niyat-ivory-border">
                Order Summary ({items.length} {items.length === 1 ? "item" : "items"})
              </h3>

              {/* Items List */}
              <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 text-xs">
                    <div className="relative w-12 h-12 rounded-xl bg-neutral-50 border border-niyat-ivory-border/60 overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-niyat-muted">
                          •
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-niyat-charcoal truncate">
                        {item.name}
                      </h4>
                      <p className="text-niyat-muted text-[11px]">
                        Qty: {item.quantity} • {item.sizeLabel}
                      </p>
                    </div>
                    <span className="font-serif font-bold text-niyat-charcoal">
                      {formatPaise(item.regularPricePaise * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon Input */}
              <div className="pt-2 border-t border-niyat-ivory-border space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-niyat-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon Code"
                      disabled={Boolean(appliedCoupon)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-niyat-ivory-border text-xs uppercase text-niyat-charcoal placeholder:text-niyat-muted focus:outline-none focus:border-niyat-gold disabled:bg-neutral-50"
                    />
                  </div>
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-all"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="px-5 py-2 rounded-xl bg-niyat-emerald text-white text-xs font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark disabled:opacity-50 transition-all"
                    >
                      {validatingCoupon ? "..." : "Apply"}
                    </button>
                  )}
                </div>

                {couponMsg && (
                  <p
                    className={`text-[11px] font-medium ${
                      couponMsg.isError ? "text-red-600" : "text-emerald-700"
                    }`}
                  >
                    {couponMsg.text}
                  </p>
                )}
              </div>

              {/* Price Calculations */}
              <div className="space-y-2.5 pt-2 border-t border-niyat-ivory-border text-xs text-niyat-charcoal/80">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-niyat-charcoal">
                    {formatPaise(subtotalPaise)}
                  </span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon Discount</span>
                    <span>- {formatPaise(couponDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Standard Shipping</span>
                  {shippingFeePaise === 0 ? (
                    <span className="text-emerald-700 font-semibold uppercase text-[11px]">
                      Complimentary Free
                    </span>
                  ) : (
                    <span className="font-medium text-niyat-charcoal">
                      {formatPaise(shippingFeePaise)}
                    </span>
                  )}
                </div>

                <div className="flex justify-between text-niyat-muted text-[11px]">
                  <span>Itemized GST (18% inclusive)</span>
                  <span>{formatPaise(taxPaise)}</span>
                </div>

                <div className="flex justify-between pt-3 border-t border-niyat-ivory-border text-base text-niyat-charcoal font-bold">
                  <span className="font-serif">Grand Total</span>
                  <span className="font-serif text-2xl text-niyat-emerald font-bold">
                    {formatPaise(grandTotalPaise)}
                  </span>
                </div>
              </div>

              {/* Place Order CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-full bg-niyat-emerald text-white text-xs sm:text-sm font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Placing Your Order...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-niyat-gold" />
                    {paymentMethod === "COD" ? "Confirm & Place COD Order" : "Pay with Razorpay"}
                  </>
                )}
              </button>

              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-niyat-muted text-center">
                <ShieldCheck className="w-4 h-4 text-niyat-emerald" />
                <span>256-Bit Encrypted Payment Processing</span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Interactive Razorpay Payment Modal / Sandbox Gateway */}
      {paymentModalOpen && activePaymentDetails && (
        <RazorpayPaymentModal
          isOpen={paymentModalOpen}
          orderNumber={activePaymentDetails.orderNumber}
          orderId={activePaymentDetails.orderId}
          amountPaise={activePaymentDetails.amountPaise}
          customerName={activePaymentDetails.customerName}
          customerEmail={activePaymentDetails.customerEmail}
          customerPhone={activePaymentDetails.customerPhone}
          razorpayOrderId={activePaymentDetails.razorpayOrderId}
          onSuccess={async (paymentId, signature) => {
            await verifyAndCompleteOrder({
              orderId: activePaymentDetails.orderId,
              orderNumber: activePaymentDetails.orderNumber,
              razorpayOrderId: activePaymentDetails.razorpayOrderId,
              razorpayPaymentId: paymentId,
              razorpaySignature: signature,
              guestOrderToken: activePaymentDetails.guestOrderToken,
            });
          }}
          onClose={() => {
            setPaymentModalOpen(false);
            setOrderError(
              `Order ${activePaymentDetails.orderNumber} is reserved. Complete payment whenever you are ready.`
            );
          }}
        />
      )}
    </div>
  );
}
