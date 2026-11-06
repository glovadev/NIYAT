"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { formatPaise } from "@/lib/utils";
import { adminRawFetch as adminFetch } from "@/lib/api/admin-client";
import {
  Building2,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  Edit2,
  Lock,
  Boxes,
  Users,
  Coins,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Save,
  Check,
  Percent,
  ShoppingBag,
  Truck,
  ArrowRight,
  Clock,
  CreditCard,
  FileText,
  MapPin,
  Phone,
  Mail,
  Send,
  Printer,
  ChevronRight,
} from "lucide-react";

interface DistributorItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  gstNumber: string;
  status: "ACTIVE" | "DISABLED";
  role: string;
  createdAt: string;
  totalOrders: number;
  totalSpentPaise: number;
  lastOrderAt: string | null;
}

interface ProductPricingItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  sizeLabel: string;
  categoryName: string;
  regularPricePaise: number;
  salePricePaise: number | null;
  distributorPricePaise: number | null;
  distributorMinQuantity: number;
  stockQuantity: number;
  status: string;
  imageUrl: string;
}

interface AdminDistributorOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  gstNumber: string;
  poNumber?: string;
  itemsCount: number;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    sizeLabel: string;
    imageUrl?: string;
    unitPricePaise: number;
    quantity: number;
    lineTotalPaise: number;
  }>;
  shippingAddress: {
    recipientName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  subtotalPaise: number;
  taxPaise: number;
  shippingPaise: number;
  totalPaise: number;
  paymentMethod: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  shipment?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    shippedAt?: string;
    deliveredAt?: string;
  } | null;
  statusHistory?: Array<{
    type: string;
    from?: string;
    to: string;
    actorType: string;
    reason?: string;
    at: string;
  }>;
}

export default function AdminDistributorsPage() {
  const [activeTab, setActiveTab] = useState<"ACCOUNTS" | "PRICING" | "ORDERS">("ACCOUNTS");

  // Orders state
  const [orders, setOrders] = useState<AdminDistributorOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFulfilmentFilter, setOrderFulfilmentFilter] = useState("ALL");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("ALL");

  // Order status update modal state
  const [dispatchModalOrder, setDispatchModalOrder] = useState<AdminDistributorOrder | null>(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<AdminDistributorOrder | null>(null);
  const [modalNewStatus, setModalNewStatus] = useState("CONFIRMED");
  const [modalCarrier, setModalCarrier] = useState("");
  const [modalTrackingNumber, setModalTrackingNumber] = useState("");
  const [modalTrackingUrl, setModalTrackingUrl] = useState("");
  const [modalNote, setModalNote] = useState("");
  const [modalPaymentStatus, setModalPaymentStatus] = useState("");
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false);
  const [transitioningOrderId, setTransitioningOrderId] = useState<string | null>(null);

  // Accounts state
  const [distributors, setDistributors] = useState<DistributorItem[]>([]);
  const [loadingDistributors, setLoadingDistributors] = useState(true);
  const [distributorSearch, setDistributorSearch] = useState("");
  const [distributorStatusFilter, setDistributorStatusFilter] = useState("ALL");

  // Create / Edit modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDistributor, setEditingDistributor] = useState<DistributorItem | null>(null);
  const [savingDistributor, setSavingDistributor] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form inputs
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formGstNumber, setFormGstNumber] = useState("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "DISABLED">("ACTIVE");

  // Pricing state
  const [products, setProducts] = useState<ProductPricingItem[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [pricingSearch, setPricingSearch] = useState("");
  const [pricingCategoryFilter, setPricingCategoryFilter] = useState("ALL");
  const [categories, setCategories] = useState<string[]>([]);

  // Draft edits for pricing: map of productId -> { distributorPricePaise, distributorMinQuantity, dirty }
  const [draftPricing, setDraftPricing] = useState<
    Record<string, { priceRupees: string; minQty: number; dirty: boolean }>
  >({});
  const [savingPricingId, setSavingPricingId] = useState<string | null>(null);
  const [savingAllPricing, setSavingAllPricing] = useState(false);
  const [pricingFeedback, setPricingFeedback] = useState<string | null>(null);

  // Global batch discount helper
  const [batchDiscountPercent, setBatchDiscountPercent] = useState("35");
  const [batchMinQty, setBatchMinQty] = useState("10");


  const loadDistributors = async () => {
    setLoadingDistributors(true);
    try {
      const res = await adminFetch("/api/admin/distributors");
      const json = await res.json();
      if (json.success && json.data) {
        setDistributors(json.data.distributors || []);
      }
    } catch (err) {
      console.error("Failed to load distributors:", err);
    } finally {
      setLoadingDistributors(false);
    }
  };

  const loadPricing = async () => {
    setLoadingPricing(true);
    try {
      const res = await adminFetch("/api/admin/distributors/pricing");
      const json = await res.json();
      if (json.success && json.data) {
        const prodList: ProductPricingItem[] = json.data.products || [];
        setProducts(prodList);

        // Extract unique categories
        const catSet = new Set<string>();
        prodList.forEach((p) => {
          if (p.categoryName) catSet.add(p.categoryName);
        });
        setCategories(Array.from(catSet));

        // Initialize draft pricing state
        const initialDrafts: Record<
          string,
          { priceRupees: string; minQty: number; dirty: boolean }
        > = {};
        prodList.forEach((p) => {
          const defaultPrice =
            typeof p.distributorPricePaise === "number" && p.distributorPricePaise > 0
              ? (p.distributorPricePaise / 100).toFixed(0)
              : (Math.round(p.regularPricePaise * 0.65) / 100).toFixed(0);

          initialDrafts[p.id] = {
            priceRupees: defaultPrice,
            minQty: p.distributorMinQuantity || 10,
            dirty: false,
          };
        });
        setDraftPricing(initialDrafts);
      }
    } catch (err) {
      console.error("Failed to load pricing:", err);
    } finally {
      setLoadingPricing(false);
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await adminFetch("/api/admin/distributors/orders");
      const json = await res.json();
      if (json.success && json.data) {
        setOrders(json.data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load distributor orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadDistributors();
    loadPricing();
    loadOrders();
  }, []);

  // Quick status advance: e.g. CONFIRMED -> PROCESSING, PROCESSING -> SHIPPED, SHIPPED -> DELIVERED
  const handleQuickAdvanceStatus = async (order: AdminDistributorOrder, nextStatus: string) => {
    setTransitioningOrderId(order.id);
    try {
      const res = await adminFetch(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          note: `Quick advanced to ${nextStatus} by store admin`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update order status");
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, fulfilmentStatus: nextStatus } : o))
      );
      setPricingFeedback(`Order ${order.orderNumber} updated to ${nextStatus}!`);
      setTimeout(() => setPricingFeedback(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setTransitioningOrderId(null);
    }
  };

  // Change status directly to any status via dropdown
  const handleChangeStatusDirect = async (orderId: string, newStatus: string) => {
    setTransitioningOrderId(orderId);
    try {
      const res = await adminFetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          note: `Fulfilment changed to ${newStatus} by admin`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update status");
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, fulfilmentStatus: newStatus } : o))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setTransitioningOrderId(null);
    }
  };

  // Toggle or mark Payment as PAID
  const handleQuickTogglePayment = async (orderId: string, newPaymentStatus: string) => {
    setTransitioningOrderId(orderId);
    try {
      const res = await adminFetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: newPaymentStatus,
          note: `Payment status marked as ${newPaymentStatus} by admin`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update payment status");
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: newPaymentStatus } : o))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update payment status");
    } finally {
      setTransitioningOrderId(null);
    }
  };

  // Open detailed dispatch modal
  const openDispatchModal = (order: AdminDistributorOrder) => {
    setDispatchModalOrder(order);
    setModalNewStatus(order.fulfilmentStatus);
    setModalPaymentStatus(order.paymentStatus);
    setModalCarrier(order.shipment?.carrier || "VRL Logistics / Freight");
    setModalTrackingNumber(order.shipment?.trackingNumber || "");
    setModalTrackingUrl(order.shipment?.trackingUrl || "");
    setModalNote("");
  };

  const handleSaveDispatchModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalOrder) return;
    setUpdatingOrderStatus(true);
    try {
      const payload: Record<string, any> = {
        status: modalNewStatus,
        paymentStatus: modalPaymentStatus || undefined,
        carrier: modalCarrier.trim() || undefined,
        trackingNumber: modalTrackingNumber.trim() || undefined,
        trackingUrl: modalTrackingUrl.trim() || undefined,
        note: modalNote.trim() || undefined,
      };

      const res = await adminFetch(`/api/admin/orders/${dispatchModalOrder.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update dispatch details");
      }

      setDispatchModalOrder(null);
      await loadOrders();
      setPricingFeedback("Dispatch and status updated successfully!");
      setTimeout(() => setPricingFeedback(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save dispatch details");
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  const openCreateModal = () => {
    setEditingDistributor(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormPassword("");
    setFormCompanyName("");
    setFormGstNumber("");
    setFormStatus("ACTIVE");
    setFormError(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (d: DistributorItem) => {
    setEditingDistributor(d);
    setFormName(d.name);
    setFormEmail(d.email);
    setFormPhone(d.phone || "");
    setFormPassword(""); // Leave empty unless resetting
    setFormCompanyName(d.companyName);
    setFormGstNumber(d.gstNumber);
    setFormStatus(d.status);
    setFormError(null);
    setCreateModalOpen(true);
  };

  const handleSaveDistributor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDistributor(true);
    setFormError(null);

    try {
      if (editingDistributor) {
        // Edit existing
        const payload: Record<string, any> = {
          name: formName.trim(),
          phone: formPhone.trim(),
          companyName: formCompanyName.trim(),
          gstNumber: formGstNumber.trim(),
          status: formStatus,
        };
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }

        const res = await adminFetch(`/api/admin/distributors/${editingDistributor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to update distributor");
        }
      } else {
        // Create new
        const payload = {
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          password: formPassword.trim(),
          companyName: formCompanyName.trim(),
          gstNumber: formGstNumber.trim(),
          status: formStatus,
        };

        const res = await adminFetch("/api/admin/distributors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to create distributor");
        }
      }

      setCreateModalOpen(false);
      await loadDistributors();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error saving distributor");
    } finally {
      setSavingDistributor(false);
    }
  };

  const handleToggleStatus = async (d: DistributorItem) => {
    const nextStatus = d.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      const res = await adminFetch(`/api/admin/distributors/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setDistributors((prev) =>
          prev.map((item) => (item.id === d.id ? { ...item, status: nextStatus } : item))
        );
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  // Handle single product pricing save
  const handleSaveSinglePricing = async (productId: string) => {
    const draft = draftPricing[productId];
    if (!draft) return;

    setSavingPricingId(productId);
    setPricingFeedback(null);
    try {
      const pricePaise = Math.round(parseFloat(draft.priceRupees || "0") * 100);
      const res = await adminFetch("/api/admin/distributors/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          distributorPricePaise: pricePaise,
          distributorMinQuantity: draft.minQty,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDraftPricing((prev) => ({
          ...prev,
          [productId]: { ...prev[productId], dirty: false },
        }));
        setPricingFeedback("Pricing updated successfully!");
        setTimeout(() => setPricingFeedback(null), 3000);
      } else {
        alert(json.error?.message || "Failed to update pricing");
      }
    } catch (err) {
      console.error("Save pricing error:", err);
    } finally {
      setSavingPricingId(null);
    }
  };

  // Handle batch pricing save for all dirty products
  const handleSaveAllPricing = async () => {
    const dirtyIds = Object.keys(draftPricing).filter((id) => draftPricing[id]?.dirty);
    if (dirtyIds.length === 0) {
      setPricingFeedback("No changes to save.");
      setTimeout(() => setPricingFeedback(null), 2500);
      return;
    }

    setSavingAllPricing(true);
    setPricingFeedback(null);
    try {
      const updates = dirtyIds.map((id) => ({
        productId: id,
        distributorPricePaise: Math.round(parseFloat(draftPricing[id].priceRupees || "0") * 100),
        distributorMinQuantity: draftPricing[id].minQty,
      }));

      const res = await adminFetch("/api/admin/distributors/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();
      if (json.success) {
        setDraftPricing((prev) => {
          const next = { ...prev };
          dirtyIds.forEach((id) => {
            if (next[id]) next[id] = { ...next[id], dirty: false };
          });
          return next;
        });
        setPricingFeedback(`Updated wholesale rules for ${dirtyIds.length} products!`);
        setTimeout(() => setPricingFeedback(null), 3500);
      } else {
        alert(json.error?.message || "Failed to update bulk pricing");
      }
    } catch (err) {
      console.error("Bulk save error:", err);
    } finally {
      setSavingAllPricing(false);
    }
  };

  // Apply batch discount formula across all products
  const handleApplyBatchDiscount = () => {
    const discount = parseFloat(batchDiscountPercent) || 35;
    const minQty = parseInt(batchMinQty, 10) || 10;
    const factor = (100 - discount) / 100;

    setDraftPricing((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        const calculatedPriceRupees = (
          Math.round((p.regularPricePaise * factor) / 100)
        ).toFixed(0);
        next[p.id] = {
          priceRupees: calculatedPriceRupees,
          minQty: minQty,
          dirty: true,
        };
      });
      return next;
    });

    setPricingFeedback(`Calculated ${discount}% off wholesale price for all products. Click 'Save All Changes' to commit.`);
  };

  // Metrics
  const totalWholesaleSpend = useMemo(
    () => distributors.reduce((sum, d) => sum + d.totalSpentPaise, 0),
    [distributors]
  );
  const activeDistributorsCount = useMemo(
    () => distributors.filter((d) => d.status === "ACTIVE").length,
    [distributors]
  );
  const totalBulkOrders = useMemo(
    () => distributors.reduce((sum, d) => sum + d.totalOrders, 0),
    [distributors]
  );

  // Filtered distributors
  const filteredDistributors = useMemo(() => {
    return distributors.filter((d) => {
      if (distributorStatusFilter !== "ALL" && d.status !== distributorStatusFilter) {
        return false;
      }
      if (distributorSearch.trim()) {
        const q = distributorSearch.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.email.toLowerCase().includes(q) ||
          d.companyName.toLowerCase().includes(q) ||
          d.phone.includes(q) ||
          d.gstNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [distributors, distributorStatusFilter, distributorSearch]);

  // Filtered pricing products
  const filteredPricingProducts = useMemo(() => {
    return products.filter((p) => {
      if (pricingCategoryFilter !== "ALL" && p.categoryName !== pricingCategoryFilter) {
        return false;
      }
      if (pricingSearch.trim()) {
        const q = pricingSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, pricingCategoryFilter, pricingSearch]);

  // Filtered distributor orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderFulfilmentFilter !== "ALL" && o.fulfilmentStatus !== orderFulfilmentFilter) {
        return false;
      }
      if (orderPaymentFilter !== "ALL" && o.paymentStatus !== orderPaymentFilter) {
        return false;
      }
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.companyName.toLowerCase().includes(q) ||
          o.contactName.toLowerCase().includes(q) ||
          o.contactPhone.includes(q) ||
          (o.poNumber && o.poNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [orders, orderFulfilmentFilter, orderPaymentFilter, orderSearch]);

  const anyDirtyPricing = useMemo(
    () => Object.values(draftPricing).some((d) => d?.dirty),
    [draftPricing]
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
                Distributor & Wholesale Hub
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage authorized B2B distributors, bulk volume pricing, and minimum order rules
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "ACCOUNTS" && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-semibold text-xs tracking-wide shadow-lg shadow-amber-500/10 transition"
            >
              <Plus className="w-4 h-4" />
              Create Distributor
            </button>
          )}

          {activeTab === "PRICING" && (
            <button
              onClick={handleSaveAllPricing}
              disabled={savingAllPricing || !anyDirtyPricing}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition shadow-lg ${
                anyDirtyPricing
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
              }`}
            >
              <Save className="w-4 h-4" />
              {savingAllPricing ? "Saving Changes..." : "Save All Pricing Changes"}
            </button>
          )}

          {activeTab === "ORDERS" && (
            <button
              onClick={loadOrders}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-xs tracking-wide shadow transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? "animate-spin" : ""}`} />
              Refresh Orders
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Distributors</div>
            <div className="text-xl font-bold text-white mt-0.5">
              {distributors.length}
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">
              {activeDistributorsCount} active partners
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("ORDERS")}
          className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-blue-500/40 transition"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Bulk Orders Placed</div>
            <div className="text-xl font-bold text-white mt-0.5">
              {totalBulkOrders}
            </div>
            <div className="text-[10px] text-blue-400 mt-0.5 hover:underline">
              View & Manage Orders →
            </div>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">B2B Wholesale Value</div>
            <div className="text-xl font-bold text-white mt-0.5">
              {formatPaise(totalWholesaleSpend)}
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">Lifetime fulfilled volume</div>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Distributor Portal</div>
            <div className="text-sm font-semibold text-white mt-0.5">Active & Ready</div>
            <a
              href="/distributor/login"
              target="_blank"
              className="text-[10px] text-amber-400 hover:underline mt-0.5 inline-block"
            >
              Open Distributor Login ↗
            </a>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("ACCOUNTS")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === "ACCOUNTS"
              ? "border-amber-400 text-amber-400 bg-amber-400/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Distributor Accounts ({distributors.length})
        </button>

        <button
          onClick={() => setActiveTab("PRICING")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === "PRICING"
              ? "border-amber-400 text-amber-400 bg-amber-400/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
          }`}
        >
          <Boxes className="w-4 h-4" />
          Wholesale Pricing & Bulk Rules ({products.length})
          {anyDirtyPricing && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("ORDERS")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === "ORDERS"
              ? "border-amber-400 text-amber-400 bg-amber-400/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Wholesale Orders ({orders.length})
        </button>
      </div>

      {/* Feedback banner */}
      {pricingFeedback && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{pricingFeedback}</span>
        </div>
      )}

      {/* TAB 1: DISTRIBUTOR ACCOUNTS */}
      {activeTab === "ACCOUNTS" && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by company name, contact, email, phone or GSTIN..."
                value={distributorSearch}
                onChange={(e) => setDistributorSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={distributorStatusFilter}
                onChange={(e) => setDistributorStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400/50"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="DISABLED">Disabled Only</option>
              </select>

              <button
                onClick={loadDistributors}
                title="Refresh distributors list"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Distributors Table */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Distributor / Business</th>
                    <th className="py-3.5 px-4">Contact Info</th>
                    <th className="py-3.5 px-4">GSTIN</th>
                    <th className="py-3.5 px-4">Total Orders</th>
                    <th className="py-3.5 px-4">Wholesale Volume</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {loadingDistributors ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                        Loading distributors...
                      </td>
                    </tr>
                  ) : filteredDistributors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        No distributors found matching criteria. Click &quot;Create Distributor&quot; to add one.
                      </td>
                    </tr>
                  ) : (
                    filteredDistributors.map((d) => (
                      <tr
                        key={d.id}
                        className="hover:bg-slate-900/40 transition group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white text-sm">
                            {d.companyName}
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            Contact: {d.name}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-200">{d.email}</div>
                          <div className="text-slate-400 text-[11px] font-mono">
                            {d.phone || "No phone"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {d.gstNumber ? (
                            <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-amber-300">
                              {d.gstNumber}
                            </span>
                          ) : (
                            <span className="text-slate-500">Unspecified</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-white">
                            {d.totalOrders}
                          </span>{" "}
                          orders
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-amber-400">
                          {formatPaise(d.totalSpentPaise)}
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleStatus(d)}
                            title="Click to toggle status"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition ${
                              d.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                d.status === "ACTIVE"
                                  ? "bg-emerald-400"
                                  : "bg-rose-400"
                              }`}
                            />
                            {d.status}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(d)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 transition"
                              title="Edit Distributor details or Reset Password"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WHOLESALE ORDERS MANAGEMENT */}
      {activeTab === "ORDERS" && (
        <div className="space-y-6">
          {/* Orders Filters Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search orders by order #, distributor name, phone or PO number..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={orderFulfilmentFilter}
                onChange={(e) => setOrderFulfilmentFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400/50"
              >
                <option value="ALL">All Fulfilment Statuses</option>
                <option value="CONFIRMED">CONFIRMED (Awaiting Prep)</option>
                <option value="PROCESSING">PROCESSING (Packing Freight)</option>
                <option value="SHIPPED">SHIPPED (In Transit)</option>
                <option value="DELIVERED">DELIVERED (Fulfilled)</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              <select
                value={orderPaymentFilter}
                onChange={(e) => setOrderPaymentFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400/50"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PENDING">Pending Settlement</option>
                <option value="PAID">Paid / Settled</option>
              </select>

              <button
                onClick={loadOrders}
                title="Refresh orders list"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              >
                <RefreshCw className={`w-4 h-4 ${loadingOrders ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Order / PO</th>
                    <th className="py-3.5 px-4">Distributor Partner</th>
                    <th className="py-3.5 px-4">Bulk Items</th>
                    <th className="py-3.5 px-4">Wholesale Total</th>
                    <th className="py-3.5 px-4">Payment Status</th>
                    <th className="py-3.5 px-4">Fulfilment Status & Quick Advance</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {loadingOrders ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                        Loading distributor wholesale orders...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        No wholesale orders found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const formattedDate = new Date(order.createdAt).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short", year: "numeric" }
                      );

                      const isTransitioning = transitioningOrderId === order.id;

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-slate-900/40 transition group"
                        >
                          {/* Order Reference */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-white text-xs">
                              {order.orderNumber}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {formattedDate}
                            </div>
                            {order.poNumber && (
                              <div className="text-[10px] text-amber-300/90 font-mono mt-0.5">
                                PO: {order.poNumber}
                              </div>
                            )}
                          </td>

                          {/* Distributor Info */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">
                              {order.companyName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {order.contactName} • {order.contactPhone}
                            </div>
                            {order.gstNumber && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                GST: {order.gstNumber}
                              </div>
                            )}
                          </td>

                          {/* Items count */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-white">
                              {order.itemsCount}
                            </span>{" "}
                            units
                            <div className="text-[10px] text-slate-500">
                              ({order.items.length} unique products)
                            </div>
                          </td>

                          {/* Total */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-amber-400 text-sm">
                              {formatPaise(order.totalPaise)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {order.paymentMethod}
                            </div>
                          </td>

                          {/* Payment Status with quick toggle */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                                  order.paymentStatus === "PAID"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-amber-400/10 text-amber-300 border-amber-400/30"
                                }`}
                              >
                                {order.paymentStatus}
                              </span>

                              {order.paymentStatus === "PENDING" && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickTogglePayment(order.id, "PAID")}
                                  disabled={isTransitioning}
                                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition border border-emerald-500/40"
                                  title="Mark wholesale payment collected / settled"
                                >
                                  Mark Paid
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Fulfilment Status & Stepper */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-2">
                              {/* Current status badge + Dropdown changer */}
                              <div className="flex items-center gap-2">
                                <select
                                  value={order.fulfilmentStatus}
                                  disabled={isTransitioning}
                                  onChange={(e) =>
                                    handleChangeStatusDirect(order.id, e.target.value)
                                  }
                                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg outline-none border transition cursor-pointer ${
                                    order.fulfilmentStatus === "CONFIRMED"
                                      ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                                      : order.fulfilmentStatus === "PROCESSING"
                                      ? "bg-amber-400/10 text-amber-300 border-amber-400/30"
                                      : order.fulfilmentStatus === "SHIPPED"
                                      ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                                      : order.fulfilmentStatus === "DELIVERED"
                                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                      : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                  }`}
                                >
                                  <option value="CONFIRMED" className="bg-slate-900 text-white">
                                    CONFIRMED
                                  </option>
                                  <option value="PROCESSING" className="bg-slate-900 text-white">
                                    PROCESSING
                                  </option>
                                  <option value="PACKED" className="bg-slate-900 text-white">
                                    PACKED
                                  </option>
                                  <option value="SHIPPED" className="bg-slate-900 text-white">
                                    SHIPPED
                                  </option>
                                  <option value="OUT_FOR_DELIVERY" className="bg-slate-900 text-white">
                                    OUT FOR DELIVERY
                                  </option>
                                  <option value="DELIVERED" className="bg-slate-900 text-white">
                                    DELIVERED
                                  </option>
                                  <option value="CANCELLED" className="bg-slate-900 text-white">
                                    CANCELLED
                                  </option>
                                </select>
                              </div>

                              {/* Quick 1-Click Stepper Advance Button */}
                              <div>
                                {order.fulfilmentStatus === "CONFIRMED" && (
                                  <button
                                    type="button"
                                    disabled={isTransitioning}
                                    onClick={() =>
                                      handleQuickAdvanceStatus(order, "PROCESSING")
                                    }
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] shadow transition"
                                  >
                                    <Clock className="w-3 h-3" />
                                    Advance to Processing →
                                  </button>
                                )}

                                {order.fulfilmentStatus === "PROCESSING" && (
                                  <button
                                    type="button"
                                    disabled={isTransitioning}
                                    onClick={() => openDispatchModal(order)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-bold text-[10px] shadow transition"
                                  >
                                    <Truck className="w-3 h-3" />
                                    Dispatch / Ship Order →
                                  </button>
                                )}

                                {order.fulfilmentStatus === "SHIPPED" && (
                                  <button
                                    type="button"
                                    disabled={isTransitioning}
                                    onClick={() =>
                                      handleQuickAdvanceStatus(order, "DELIVERED")
                                    }
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[10px] shadow transition"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Mark as Delivered ✓
                                  </button>
                                )}

                                {order.fulfilmentStatus === "DELIVERED" && (
                                  <span className="text-[10px] text-emerald-400 font-semibold inline-flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Fulfilled & Delivered
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Row Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Dispatch Editor Modal */}
                              <button
                                onClick={() => openDispatchModal(order)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 transition"
                                title="Update Dispatch Logistics & Tracking AWB"
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </button>

                              {/* View Invoice Sheet */}
                              <button
                                onClick={() => setSelectedOrderForInvoice(order)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 transition"
                                title="View Commercial Invoice Slip"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH LOGISTICS & STATUS UPDATE MODAL */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-amber-300 to-emerald-500" />

            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-serif">
                    Update Wholesale Order Status & Dispatch
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {dispatchModalOrder.orderNumber} • {dispatchModalOrder.companyName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDispatchModal} className="p-6 space-y-4 text-xs">
              {/* Stepper Stage Selector */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                  Transition Fulfilment Status *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "CONFIRMED", label: "Confirmed" },
                    { id: "PROCESSING", label: "Processing" },
                    { id: "SHIPPED", label: "Shipped" },
                    { id: "DELIVERED", label: "Delivered" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setModalNewStatus(s.id)}
                      className={`py-2 px-2.5 rounded-xl text-center font-bold transition border ${
                        modalNewStatus === s.id
                          ? "bg-amber-400 text-slate-950 border-amber-400 shadow-md"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Settlement Status */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                  Payment Status
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="paymentStatusRadio"
                      value="PENDING"
                      checked={modalPaymentStatus === "PENDING"}
                      onChange={() => setModalPaymentStatus("PENDING")}
                      className="text-amber-400 focus:ring-amber-400"
                    />
                    PENDING (Awaiting settlement)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="paymentStatusRadio"
                      value="PAID"
                      checked={modalPaymentStatus === "PAID"}
                      onChange={() => setModalPaymentStatus("PAID")}
                      className="text-amber-400 focus:ring-amber-400"
                    />
                    PAID (Payment verified)
                  </label>
                </div>
              </div>

              {/* Courier & Tracking Details */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Logistics & Shipment Dispatch
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">
                      Freight Carrier / Courier
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VRL Logistics / Blue Dart / Delhivery"
                      value={modalCarrier}
                      onChange={(e) => setModalCarrier(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">
                      AWB / LR Tracking Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LR-98374201"
                      value={modalTrackingNumber}
                      onChange={(e) => setModalTrackingNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">
                    Tracking URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://carrier.com/track/..."
                    value={modalTrackingUrl}
                    onChange={(e) => setModalTrackingUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">
                    Admin Status Transition Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bulk shipment loaded on truck for delivery"
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDispatchModalOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updatingOrderStatus}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-bold shadow-md transition disabled:opacity-50"
                >
                  {updatingOrderStatus ? "Updating Status..." : "Save Status & Dispatch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMMERCIAL INVOICE / PACKING SLIP MODAL */}
      {selectedOrderForInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:p-0 print:bg-white">
          <div className="w-full max-w-2xl bg-slate-900 print:bg-white print:text-black border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-white text-base">
                  Wholesale Commercial Packing & Invoice Slip
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-300 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setSelectedOrderForInvoice(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Slip */}
            <div className="p-8 space-y-6 overflow-y-auto text-slate-300 print:text-slate-900 print:p-6 text-xs">
              <div className="flex justify-between items-start border-b border-slate-800 pb-6 print:border-slate-300">
                <div>
                  <div className="font-serif font-bold text-xl text-white print:text-black tracking-wider">
                    NIYAT ORGANICS PVT. LTD.
                  </div>
                  <div className="text-slate-400 print:text-slate-600 mt-1">
                    B2B Wholesale & Distribution Backoffice
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    GSTIN: 27AABCN9482L1ZX
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-amber-400 print:text-amber-800 text-sm">
                    {selectedOrderForInvoice.orderNumber}
                  </div>
                  <div className="text-slate-400 print:text-slate-600 mt-1">
                    Date: {new Date(selectedOrderForInvoice.createdAt).toLocaleDateString("en-IN")}
                  </div>
                  {selectedOrderForInvoice.poNumber && (
                    <div className="font-mono text-slate-400 mt-0.5">
                      PO: {selectedOrderForInvoice.poNumber}
                    </div>
                  )}
                  <div className="font-semibold text-emerald-400 mt-1">
                    STATUS: {selectedOrderForInvoice.fulfilmentStatus}
                  </div>
                </div>
              </div>

              {/* Billed To / Shipping Address */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider mb-1">
                    Distributor Enterprise
                  </div>
                  <div className="font-bold text-white print:text-black text-sm">
                    {selectedOrderForInvoice.companyName}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    Contact: {selectedOrderForInvoice.contactName} ({selectedOrderForInvoice.contactPhone})
                  </div>
                  {selectedOrderForInvoice.gstNumber && (
                    <div className="font-mono text-slate-400 mt-0.5">
                      GSTIN: {selectedOrderForInvoice.gstNumber}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider mb-1">
                    Freight Dispatch Address
                  </div>
                  <div className="text-slate-300 print:text-slate-800">
                    {selectedOrderForInvoice.shippingAddress.addressLine1}
                    {selectedOrderForInvoice.shippingAddress.addressLine2 && `, ${selectedOrderForInvoice.shippingAddress.addressLine2}`}
                  </div>
                  <div className="text-slate-300 print:text-slate-800">
                    {selectedOrderForInvoice.shippingAddress.city}, {selectedOrderForInvoice.shippingAddress.state} - {selectedOrderForInvoice.shippingAddress.postalCode}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    Payment Method: {selectedOrderForInvoice.paymentMethod} ({selectedOrderForInvoice.paymentStatus})
                  </div>
                  {selectedOrderForInvoice.shipment?.carrier && (
                    <div className="text-purple-400 mt-0.5">
                      Carrier: {selectedOrderForInvoice.shipment.carrier} (AWB: {selectedOrderForInvoice.shipment.trackingNumber || "N/A"})
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 print:border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-700 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-right">Wholesale Rate</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                    {selectedOrderForInvoice.items.map((i, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-medium text-white print:text-black">
                          {i.productName} ({i.sizeLabel})
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                          {i.sku}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatPaise(i.unitPricePaise)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {i.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white print:text-black">
                          {formatPaise(i.lineTotalPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5">
                  <div className="flex justify-between text-slate-400 print:text-slate-600">
                    <span>Wholesale Subtotal:</span>
                    <span className="font-mono text-white print:text-black">
                      {formatPaise(selectedOrderForInvoice.subtotalPaise)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400 print:text-slate-600">
                    <span>Priority B2B Freight:</span>
                    <span className="text-emerald-400 print:text-emerald-700 font-bold uppercase text-[10px]">
                      FREE
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white print:text-black pt-2 border-t border-slate-800 print:border-slate-300">
                    <span>Total Amount (INR):</span>
                    <span className="font-mono text-amber-400 print:text-amber-800 text-base">
                      {formatPaise(selectedOrderForInvoice.totalPaise)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === "PRICING" && (
        <div className="space-y-6">
          {/* Quick Bulk Setting Toolbar */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-400/20 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Quick Wholesale Pricing Calculator
                </h3>
                <p className="text-xs text-slate-400">
                  Pre-calculate wholesale prices for all catalog items based on regular retail MRP
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                <span className="text-xs text-slate-400">Discount:</span>
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={batchDiscountPercent}
                  onChange={(e) => setBatchDiscountPercent(e.target.value)}
                  className="w-12 bg-transparent text-xs text-amber-400 font-bold outline-none"
                />
                <span className="text-xs text-slate-400">% off MRP</span>
              </div>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                <span className="text-xs text-slate-400">Min Bulk Qty:</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={batchMinQty}
                  onChange={(e) => setBatchMinQty(e.target.value)}
                  className="w-12 bg-transparent text-xs text-amber-400 font-bold outline-none"
                />
                <span className="text-xs text-slate-400">units</span>
              </div>

              <button
                type="button"
                onClick={handleApplyBatchDiscount}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 text-xs font-semibold transition"
              >
                Apply to All Items
              </button>
            </div>
          </div>

          {/* Pricing Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products by title or SKU..."
                value={pricingSearch}
                onChange={(e) => setPricingSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pricingCategoryFilter}
                onChange={(e) => setPricingCategoryFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400/50"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                onClick={loadPricing}
                title="Refresh product pricing"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Pricing Table */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Product</th>
                    <th className="py-3.5 px-4">Category / SKU</th>
                    <th className="py-3.5 px-4">Retail MRP</th>
                    <th className="py-3.5 px-4">Distributor Wholesale Price (₹)</th>
                    <th className="py-3.5 px-4">Min Bulk Quantity</th>
                    <th className="py-3.5 px-4">Margin Discount</th>
                    <th className="py-3.5 px-4">Stock</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {loadingPricing ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                        Loading products and wholesale rules...
                      </td>
                    </tr>
                  ) : filteredPricingProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    filteredPricingProducts.map((p) => {
                      const draft = draftPricing[p.id] || {
                        priceRupees: "0",
                        minQty: 10,
                        dirty: false,
                      };

                      const draftPriceVal = parseFloat(draft.priceRupees) || 0;
                      const regularPriceRupees = p.regularPricePaise / 100;
                      const discountPercentage = regularPriceRupees > 0
                        ? Math.max(0, Math.round(((regularPriceRupees - draftPriceVal) / regularPriceRupees) * 100))
                        : 0;

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-900/40 transition group ${
                            draft.dirty ? "bg-amber-400/5" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 relative">
                                {p.imageUrl ? (
                                  <Image
                                    src={p.imageUrl}
                                    alt={p.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                                    <Boxes className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-white text-xs">
                                  {p.name}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {p.sizeLabel}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-300 font-medium">
                              {p.categoryName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {p.sku}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {formatPaise(p.regularPricePaise)}
                          </td>

                          {/* Editable Distributor Wholesale Price */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-400 font-semibold text-sm">
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={draft.priceRupees}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDraftPricing((prev) => ({
                                    ...prev,
                                    [p.id]: {
                                      ...prev[p.id],
                                      priceRupees: val,
                                      dirty: true,
                                    },
                                  }));
                                }}
                                className="w-24 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold outline-none"
                              />
                            </div>
                          </td>

                          {/* Editable Minimum Bulk Quantity */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                max="10000"
                                value={draft.minQty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 1;
                                  setDraftPricing((prev) => ({
                                    ...prev,
                                    [p.id]: {
                                      ...prev[p.id],
                                      minQty: val,
                                      dirty: true,
                                    },
                                  }));
                                }}
                                className="w-20 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold outline-none"
                              />
                              <span className="text-[11px] text-slate-500">
                                units
                              </span>
                            </div>
                          </td>

                          {/* Margin preview */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                              <TrendingUp className="w-3 h-3" />
                              {discountPercentage}% margin
                            </span>
                          </td>

                          {/* Available Stock */}
                          <td className="py-3.5 px-4 font-mono">
                            <span
                              className={
                                p.stockQuantity < 10
                                  ? "text-rose-400 font-bold"
                                  : "text-slate-300"
                              }
                            >
                              {p.stockQuantity}
                            </span>
                          </td>

                          {/* Row Save button */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleSaveSinglePricing(p.id)}
                              disabled={savingPricingId === p.id || !draft.dirty}
                              className={`p-1.5 rounded-lg border text-xs font-medium transition ${
                                draft.dirty
                                  ? "bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-400 shadow"
                                  : "bg-slate-900 text-slate-600 border-slate-800"
                              }`}
                              title={
                                draft.dirty ? "Save changes to this product" : "No unsaved changes"
                              }
                            >
                              {savingPricingId === p.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : draft.dirty ? (
                                <Save className="w-3.5 h-3.5" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT DISTRIBUTOR MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500" />

            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-serif">
                    {editingDistributor ? "Edit Distributor Account" : "Create New Distributor"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingDistributor
                      ? "Update partner details or reset portal password"
                      : "Provision wholesale login credentials and enterprise details"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDistributor} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Company / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Pharma & Retail"
                    value={formCompanyName}
                    onChange={(e) => setFormCompanyName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Distributor Email *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={Boolean(editingDistributor)}
                    placeholder="wholesale@company.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 disabled:opacity-60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {editingDistributor ? "Reset Password (Optional)" : "Login Password *"}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required={!editingDistributor}
                      placeholder={editingDistributor ? "Leave blank to keep current" : "Min 6 characters"}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    GSTIN / Tax ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="27ABCDE1234F1Z5"
                    value={formGstNumber}
                    onChange={(e) => setFormGstNumber(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white uppercase placeholder-slate-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Account Status
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="radio"
                      name="status"
                      value="ACTIVE"
                      checked={formStatus === "ACTIVE"}
                      onChange={() => setFormStatus("ACTIVE")}
                      className="text-amber-400 focus:ring-amber-400"
                    />
                    Active (Authorized to Order)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="radio"
                      name="status"
                      value="DISABLED"
                      checked={formStatus === "DISABLED"}
                      onChange={() => setFormStatus("DISABLED")}
                      className="text-amber-400 focus:ring-amber-400"
                    />
                    Disabled (Suspended)
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDistributor}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-semibold text-xs tracking-wide shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {savingDistributor
                    ? "Saving..."
                    : editingDistributor
                    ? "Update Distributor"
                    : "Create Distributor Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

