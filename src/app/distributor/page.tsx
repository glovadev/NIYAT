"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPaise } from "@/lib/utils";
import {
  Boxes,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Truck,
  CreditCard,
  Building,
  FileText,
  RotateCcw,
} from "lucide-react";

interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  sizeLabel: string;
  shortDescription: string;
  categoryName: string;
  regularPricePaise: number;
  salePricePaise: number | null;
  distributorPricePaise: number;
  distributorMinQuantity: number;
  discountPercent: number;
  stockQuantity: number;
  imageUrl: string;
}

interface CartItem {
  product: CatalogProduct;
  quantity: number;
}

export default function DistributorOrderPortalPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [categories, setCategories] = useState<string[]>([]);

  // Bulk Cart state
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);

  // Per-product local quantity counters (before adding to cart)
  const [inputQuantities, setInputQuantities] = useState<Record<string, number>>({});

  // Checkout form state
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"BANK_TRANSFER" | "COD" | "RAZORPAY">("BANK_TRANSFER");
  const [poNumber, setPoNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: string;
    totalPaise: number;
    itemsCount: number;
  } | null>(null);

  // Load catalog
  useEffect(() => {
    fetch("/api/distributor/products")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const prodList: CatalogProduct[] = json.data.products || [];
          setProducts(prodList);

          // Extract categories
          const catSet = new Set<string>();
          prodList.forEach((p) => {
            if (p.categoryName) catSet.add(p.categoryName);
          });
          setCategories(Array.from(catSet));

          // Initialize input quantities with min quantities
          const initialQuantities: Record<string, number> = {};
          prodList.forEach((p) => {
            initialQuantities[p.id] = p.distributorMinQuantity || 10;
          });
          setInputQuantities(initialQuantities);
        }
      })
      .catch((err) => console.error("Catalog load error:", err))
      .finally(() => setLoading(false));

    // Try prefilling distributor details from cache
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("niyat_distributor");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.companyName) setRecipientName(parsed.companyName);
          else if (parsed.name) setRecipientName(parsed.name);
          if (parsed.phone) setPhone(parsed.phone);
        }
      } catch (_) {}
    }
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== "ALL" && p.categoryName !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Adjust local quantity counter
  const handleQuantityStep = (productId: string, step: number, minQty: number) => {
    setInputQuantities((prev) => {
      const current = prev[productId] ?? minQty;
      const next = Math.max(minQty, current + step);
      return { ...prev, [productId]: next };
    });
  };

  const handleQuantityInput = (productId: string, val: string, minQty: number) => {
    const parsed = parseInt(val, 10);
    setInputQuantities((prev) => ({
      ...prev,
      [productId]: isNaN(parsed) ? minQty : Math.max(1, parsed),
    }));
  };

  // Add/Update cart item
  const handleAddToCart = (product: CatalogProduct) => {
    const qty = inputQuantities[product.id] ?? product.distributorMinQuantity;
    if (qty < product.distributorMinQuantity) {
      alert(`Minimum bulk quantity for ${product.name} is ${product.distributorMinQuantity} units.`);
      return;
    }
    setCart((prev) => ({
      ...prev,
      [product.id]: qty,
    }));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleUpdateCartQty = (productId: string, qty: number, minQty: number) => {
    if (qty < minQty) return;
    setCart((prev) => ({
      ...prev,
      [productId]: qty,
    }));
  };

  // Cart totals calculation
  const cartItemsList: CartItem[] = useMemo(() => {
    const list: CartItem[] = [];
    Object.entries(cart).forEach(([productId, quantity]) => {
      const prod = products.find((p) => p.id === productId);
      if (prod && quantity > 0) {
        list.push({ product: prod, quantity });
      }
    });
    return list;
  }, [cart, products]);

  const totalUnits = useMemo(
    () => cartItemsList.reduce((acc, item) => acc + item.quantity, 0),
    [cartItemsList]
  );

  const cartSubtotalPaise = useMemo(
    () => cartItemsList.reduce((acc, item) => acc + item.product.distributorPricePaise * item.quantity, 0),
    [cartItemsList]
  );

  // Submit wholesale order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);

    if (cartItemsList.length === 0) {
      setOrderError("Please add products to your bulk order.");
      return;
    }

    // Verify all items meet minimum bulk quantity
    for (const item of cartItemsList) {
      if (item.quantity < item.product.distributorMinQuantity) {
        setOrderError(
          `${item.product.name} requires at least ${item.product.distributorMinQuantity} units.`
        );
        return;
      }
    }

    setSubmittingOrder(true);

    try {
      const payload = {
        items: cartItemsList.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
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
        paymentMethod,
        poNumber: poNumber.trim() || undefined,
        notes: orderNotes.trim() || undefined,
      };

      const res = await fetch("/api/distributor/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to place wholesale order");
      }

      setOrderSuccess({
        orderNumber: json.data.orderNumber,
        totalPaise: json.data.totalPaise,
        itemsCount: json.data.itemsCount,
      });

      // Clear cart
      setCart({});
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : "Error submitting order");
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner / Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Direct B2B Procurement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
            Wholesale Catalog & Bulk Ordering
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Select items, choose quantities meeting minimum bulk thresholds, and submit your wholesale purchase order
          </p>
        </div>

        {/* Floating Cart Launcher Button */}
        {cartItemsList.length > 0 && (
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-400/20 transition group"
          >
            <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="leading-tight">
                {totalUnits} Units in Bulk Order
              </div>
              <div className="text-[11px] font-mono font-medium opacity-90">
                Total: {formatPaise(cartSubtotalPaise)}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>

      {/* Catalog Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by title, SKU, or active ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
              selectedCategory === "ALL"
                ? "bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading wholesale catalog...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center text-slate-500 bg-slate-900/30 rounded-3xl border border-slate-800/60">
          <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">No products match your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const currentSelectedQty =
              inputQuantities[product.id] ?? product.distributorMinQuantity;
            const inCartQty = cart[product.id];
            const lineSubtotalPaise = product.distributorPricePaise * currentSelectedQty;

            return (
              <div
                key={product.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden hover:border-amber-400/40 transition-all flex flex-col justify-between shadow-lg group relative"
              >
                {/* Wholesale Savings Tag */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 backdrop-blur-md">
                    <TrendingUp className="w-3 h-3" />
                    Save {product.discountPercent}%
                  </span>
                </div>

                {/* Card Top: Image + Info */}
                <div>
                  <div className="h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Boxes className="w-12 h-12 text-slate-700" />
                    )}
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{product.categoryName}</span>
                      <span>SKU: {product.sku}</span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-white text-base group-hover:text-amber-300 transition-colors">
                        {product.name}
                      </h3>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Net Content: <span className="font-medium text-slate-300">{product.sizeLabel}</span>
                      </div>
                    </div>

                    {/* Pricing Box */}
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                          Distributor Wholesale
                        </div>
                        <div className="text-xl font-bold text-amber-400 font-mono">
                          {formatPaise(product.distributorPricePaise)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                          Retail MRP
                        </div>
                        <div className="text-xs text-slate-400 line-through font-mono">
                          {formatPaise(product.regularPricePaise)}
                        </div>
                      </div>
                    </div>

                    {/* Minimum Bulk and Stock Strip */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="inline-flex items-center gap-1 text-slate-300 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Min Bulk:{" "}
                        <strong className="text-white">
                          {product.distributorMinQuantity} units
                        </strong>
                      </span>

                      <span
                        className={`text-[11px] font-medium ${
                          product.stockQuantity < 10 ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {product.stockQuantity} in stock
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Bulk Quantity Controller & Add to Order */}
                <div className="p-5 pt-0 border-t border-slate-800/60 mt-3 space-y-3">
                  <div className="flex items-center justify-between gap-3 pt-3">
                    <div className="flex items-center border border-slate-700 bg-slate-950 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityStep(
                            product.id,
                            -5,
                            product.distributorMinQuantity
                          )
                        }
                        className="px-2.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Decrease by 5"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min={product.distributorMinQuantity}
                        step="1"
                        value={currentSelectedQty}
                        onChange={(e) =>
                          handleQuantityInput(
                            product.id,
                            e.target.value,
                            product.distributorMinQuantity
                          )
                        }
                        className="w-16 bg-transparent text-center text-xs font-bold text-white outline-none font-mono"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityStep(
                            product.id,
                            5,
                            product.distributorMinQuantity
                          )
                        }
                        className="px-2.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Increase by 5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-500">Line Subtotal</div>
                      <div className="text-sm font-bold text-white font-mono">
                        {formatPaise(lineSubtotalPaise)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 ${
                      inCartQty
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20"
                        : "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-400/10"
                    }`}
                  >
                    {inCartQty ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        In Bulk Cart ({inCartQty} units) - Click to Update
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        Add {currentSelectedQty} Units to Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Drawer Launcher (Mobile & Desktop) */}
      {cartItemsList.length > 0 && !cartOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-xl bg-slate-900/95 backdrop-blur-xl border border-amber-400/40 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-300 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{cartItemsList.length} products • {totalUnits} bulk units</span>
            </div>
            <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
              Subtotal: {formatPaise(cartSubtotalPaise)}
            </div>
          </div>

          <button
            onClick={() => setCartOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-500/20 transition flex items-center gap-2 shrink-0"
          >
            Review & Checkout
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WHOLESALE CHECKOUT DRAWER / MODAL */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500" />

            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-serif">
                    Wholesale Order Summary
                  </h2>
                  <p className="text-xs text-slate-400">
                    {cartItemsList.length} products • {totalUnits} total bulk units
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {orderError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Order Line Items
                </div>
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl bg-slate-950/50 overflow-hidden">
                  {cartItemsList.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 relative">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Boxes className="w-6 h-6 text-slate-600 m-auto" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white text-xs truncate">
                            {product.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {formatPaise(product.distributorPricePaise)} / unit • {product.sizeLabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center border border-slate-800 bg-slate-900 rounded-lg">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateCartQty(
                                product.id,
                                quantity - 5,
                                product.distributorMinQuantity
                              )
                            }
                            className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold font-mono text-white">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateCartQty(
                                product.id,
                                quantity + 5,
                                product.distributorMinQuantity
                              )
                            }
                            className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right w-24">
                          <div className="text-xs font-bold text-amber-400 font-mono">
                            {formatPaise(product.distributorPricePaise * quantity)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(product.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                          title="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Details Form */}
              <form id="wholesale-checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-2">
                  Delivery Destination
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Recipient / Enterprise Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Distribution Center"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Contact Mobile Phone *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Street Address (Warehouse / Shop) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Plot / Building, Street, Industrial Area"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Maharashtra"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="400001"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Wholesale Payment Method Selection */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Payment & Settlement Terms
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-amber-400/50 transition">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="BANK_TRANSFER"
                        checked={paymentMethod === "BANK_TRANSFER"}
                        onChange={() => setPaymentMethod("BANK_TRANSFER")}
                        className="text-amber-400 focus:ring-amber-400"
                      />
                      <Building className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="text-xs">
                        <div className="font-semibold text-white">
                          Direct Bank Transfer / NEFT / RTGS (Net 30 Invoicing)
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Invoice issued upon dispatch, settled as per credit terms
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-amber-400/50 transition">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="COD"
                        checked={paymentMethod === "COD"}
                        onChange={() => setPaymentMethod("COD")}
                        className="text-amber-400 focus:ring-amber-400"
                      />
                      <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="text-xs">
                        <div className="font-semibold text-white">
                          Cash on Bulk Delivery (COD)
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Payment collected upon physical freight handover
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-amber-400/50 transition">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="RAZORPAY"
                        checked={paymentMethod === "RAZORPAY"}
                        onChange={() => setPaymentMethod("RAZORPAY")}
                        className="text-amber-400 focus:ring-amber-400"
                      />
                      <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
                      <div className="text-xs">
                        <div className="font-semibold text-white">
                          Online Immediate Payment (Razorpay UPI / Cards)
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Instant prepaid digital settlement
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Purchase Order (PO) Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="PO-2026-0042"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Special Freight Dispatch Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Call warehouse manager before delivery"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Drawer Footer Checkout Action */}
            <div className="p-6 border-t border-slate-800 bg-slate-950 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Wholesale Subtotal</span>
                  <span className="font-mono text-white">{formatPaise(cartSubtotalPaise)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Wholesale Freight / Shipping</span>
                  <span className="text-emerald-400 font-semibold uppercase text-[11px]">
                    FREE (B2B Priority Freight)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>GST / Commercial Taxes</span>
                  <span className="text-slate-300 text-[11px]">Included in agreed rate</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-white pt-2 border-t border-slate-800/80">
                  <span>Total Payable</span>
                  <span className="text-amber-400 font-mono text-lg">
                    {formatPaise(cartSubtotalPaise)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition"
                >
                  Continue Shopping
                </button>

                <button
                  type="submit"
                  form="wholesale-checkout-form"
                  disabled={submittingOrder}
                  className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-400/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingOrder ? "Confirming & Reserving Stock..." : "Confirm & Place Bulk Order"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDER SUCCESS MODAL */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-300 to-emerald-500" />

            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
                Purchase Order Confirmed
              </span>
              <h2 className="text-xl font-bold text-white font-serif mt-3">
                Wholesale Order Placed!
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Your bulk order has been routed to the NIYAT warehouse fulfilment team.
              </p>
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Order Reference:</span>
                <span className="font-mono font-bold text-amber-400">{orderSuccess.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Units:</span>
                <span className="font-medium text-white">{orderSuccess.itemsCount} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice Total:</span>
                <span className="font-mono font-bold text-white">{formatPaise(orderSuccess.totalPaise)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/distributor/orders"
                onClick={() => setOrderSuccess(null)}
                className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-400/20 transition flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View in My Wholesale Orders
              </Link>

              <button
                type="button"
                onClick={() => {
                  setOrderSuccess(null);
                  setCartOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition"
              >
                Place Another Bulk Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

