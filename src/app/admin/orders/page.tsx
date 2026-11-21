"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { formatPaise } from "@/lib/utils";
import { adminFetch } from "@/lib/api/admin-client";
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Send,
  Package,
  Printer,
  ExternalLink,
  FileText,
  Calendar,
  AlertTriangle,
  Check,
  Copy,
  RotateCcw,
  Star,
  ShieldAlert,
  ArrowRight,
  Info,
} from "lucide-react";

interface AdminOrderItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  itemCount: number;
  totalPaise: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  shipmentState?: string | null;
  awbCode?: string | null;
  requiresReview?: boolean;
  reviewCategory?: string | null;
  isDistributorOrder?: boolean;
  distributorInfo?: { companyName?: string; gstNumber?: string; poNumber?: string };
}

interface AvailableCourier {
  courierCompanyId: number;
  courierName: string;
  rate: number;
  etd: string;
  estimatedDeliveryDays?: number;
  rating?: number;
  isSurface: boolean;
  isRecommended: boolean;
}

interface DetailedOrder {
  _id: string;
  orderNumber: string;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    name: string;
    sizeLabel: string;
    sku: string;
    imageUrl?: string;
    regularPricePaise: number;
    effectivePricePaise: number;
    quantity: number;
    lineTotalPaise: number;
  }>;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
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

    shiprocketOrderId?: number;
    shiprocketShipmentId?: number;
    courierCompanyId?: number;
    courierName?: string;
    awbCode?: string;

    labelUrl?: string;
    manifestUrl?: string;

    pickupLocation?: string;
    pickupScheduledDate?: string;
    pickupTokenNumber?: string;

    currentShippingStatus?: string;
    currentStatusCode?: number;
    estimatedDeliveryDate?: string;
    trackingActivities?: Array<{
      scanKey: string;
      date: string;
      status: string;
      activity: string;
      location: string;
      srStatusCode?: number;
    }>;

    parcel?: {
      weightGrams: number;
      lengthCm: number;
      breadthCm: number;
      heightCm: number;
    };

    shipmentState?: string;
    operationId?: string;
    lastFailedStep?: string;
    lastError?: string;

    requiresReview?: boolean;
    reviewReason?: string;
    reviewIncidentId?: string;
    reviewCategory?: string;
    reviewAcknowledgedAt?: string;

    overrideRequest?: {
      requesterAdminId: string;
      requesterAdminEmail: string;
      requestedAt: string;
      reason: string;
      evidenceReference: string;
      targetAwbCode?: string;
      targetCancellationId?: string;
      reviewIncidentId?: string;
      shipmentStateAtRequest?: string;
      status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
      reviewedAt?: string;
      reviewerAdminId?: string;
      reviewerAdminEmail?: string;
      reviewNote?: string;
    };

    awbCancellations?: Array<{
      cancellationId?: string;
      awbCode: string;
      requestedAt: string;
      outcome: string;
      carrierResponse?: string;
      evidenceReference?: string;
      overrideReason?: string;
    }>;
  };
  statusHistory?: Array<{
    type: string;
    from: string;
    to: string;
    reason?: string;
    at: string;
  }>;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [fulfilmentFilter, setFulfilmentFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [orderTypeFilter, setOrderTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailedOrder, setDetailedOrder] = useState<DetailedOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Legacy transition form
  const [nextStatus, setNextStatus] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [statusNote, setStatusNote] = useState("");

  // Shiprocket Parcel Form States
  const [parcelWeightGrams, setParcelWeightGrams] = useState<number>(500);
  const [parcelLengthCm, setParcelLengthCm] = useState<number>(15);
  const [parcelBreadthCm, setParcelBreadthCm] = useState<number>(10);
  const [parcelHeightCm, setParcelHeightCm] = useState<number>(10);

  // Couriers & Serviceability
  const [couriers, setCouriers] = useState<AvailableCourier[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [serviceabilityError, setServiceabilityError] = useState<string | null>(null);

  // Shiprocket Actions & Feedback
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copiedAwb, setCopiedAwb] = useState(false);

  // Reconcile & Force Reset Modals
  const [showForceResetModal, setShowForceResetModal] = useState(false);
  const [forceResetReason, setForceResetReason] = useState("");
  const [forceResetEvidence, setForceResetEvidence] = useState("");
  const [confirmRemoteAbsence, setConfirmRemoteAbsence] = useState(false);

  // Two-Admin Emergency Override
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideEvidence, setOverrideEvidence] = useState("");
  const [overrideReviewNote, setOverrideReviewNote] = useState("");

  // Cancellation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Pickup Scheduling
  const [pickupDate, setPickupDate] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fulfilmentFilter !== "ALL") params.set("fulfilmentStatus", fulfilmentFilter);
      if (paymentFilter !== "ALL") params.set("paymentStatus", paymentFilter);
      if (orderTypeFilter !== "ALL") params.set("orderType", orderTypeFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await adminFetch<{ items: AdminOrderItem[] }>(
        `/api/admin/orders?${params.toString()}`
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to load orders");
      }
      setOrders(res.data.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching orders";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders();
    }, 200);
    return () => clearTimeout(timer);
  }, [fulfilmentFilter, paymentFilter, orderTypeFilter, searchQuery]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const initialOrderId = params.get("orderId");
      if (initialOrderId) {
        openOrderDetail(initialOrderId);
      }
    }
  }, []);

  const openOrderDetail = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailLoading(true);
    setActionFeedback(null);
    setServiceabilityError(null);
    setCouriers([]);
    setSelectedCourierId(null);
    try {
      const res = await adminFetch<DetailedOrder>(`/api/admin/orders/${orderId}`);
      if (res.ok && res.data) {
        setDetailedOrder(res.data);
        setNextStatus(res.data.fulfilmentStatus);
        setCarrier(res.data.shipment?.courierName || res.data.shipment?.carrier || "Delhivery");
        setTrackingNumber(res.data.shipment?.awbCode || res.data.shipment?.trackingNumber || "");
        setTrackingUrl(res.data.shipment?.trackingUrl || "");

        // Set parcel specs if available
        if (res.data.shipment?.parcel) {
          setParcelWeightGrams(res.data.shipment.parcel.weightGrams || 500);
          setParcelLengthCm(res.data.shipment.parcel.lengthCm || 15);
          setParcelBreadthCm(res.data.shipment.parcel.breadthCm || 10);
          setParcelHeightCm(res.data.shipment.parcel.heightCm || 10);
        }
      }
    } catch (err) {
      console.error("Failed to load detailed order:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCopyAwb = (awb: string) => {
    navigator.clipboard.writeText(awb);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  // --- Shiprocket Action Handlers ---

  const handleCheckServiceability = async () => {
    if (!selectedOrderId) return;
    setLoadingCouriers(true);
    setServiceabilityError(null);
    try {
      const res = await adminFetch<{ couriers: AvailableCourier[] }>(
        `/api/admin/orders/${selectedOrderId}/shipment/serviceability`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weightGrams: parcelWeightGrams,
            lengthCm: parcelLengthCm,
            breadthCm: parcelBreadthCm,
            heightCm: parcelHeightCm,
          }),
        }
      );

      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to check serviceability");
      }

      setCouriers(res.data.couriers || []);
      const rec = res.data.couriers?.find((c) => c.isRecommended);
      if (rec) {
        setSelectedCourierId(rec.courierCompanyId);
      } else if (res.data.couriers?.length) {
        setSelectedCourierId(res.data.couriers[0].courierCompanyId);
      }
    } catch (err: unknown) {
      setServiceabilityError(err instanceof Error ? err.message : "Serviceability query failed");
    } finally {
      setLoadingCouriers(false);
    }
  };

  const handleCreateShipment = async () => {
    if (!selectedOrderId) return;
    setActionLoading("CREATE");
    setActionFeedback(null);
    try {
      const res = await adminFetch<{ message?: string }>(
        `/api/admin/orders/${selectedOrderId}/shipment/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parcel: {
              weightGrams: parcelWeightGrams,
              lengthCm: parcelLengthCm,
              breadthCm: parcelBreadthCm,
              heightCm: parcelHeightCm,
            },
          }),
        }
      );

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to create shipment");
      }

      setActionFeedback({
        type: "success",
        message: res.data?.message || "Shiprocket order created successfully",
      });
      await openOrderDetail(selectedOrderId);
      loadOrders();
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Order creation failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignAwb = async (courierId?: number) => {
    if (!selectedOrderId) return;
    const targetCourierId = courierId || selectedCourierId;
    if (!targetCourierId) {
      alert("Please select a courier partner first.");
      return;
    }

    setActionLoading(`ASSIGN_${targetCourierId}`);
    setActionFeedback(null);
    try {
      const res = await adminFetch<{ message?: string }>(
        `/api/admin/orders/${selectedOrderId}/shipment/assign-awb`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courierCompanyId: targetCourierId }),
        }
      );

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to assign AWB");
      }

      setActionFeedback({
        type: "success",
        message: res.data?.message || "AWB successfully assigned",
      });
      await openOrderDetail(selectedOrderId);
      loadOrders();
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "AWB assignment failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateLabel = async () => {
    if (!selectedOrderId) return;
    setActionLoading("LABEL");
    setActionFeedback(null);
    try {
      const res = await adminFetch<{ labelUrl?: string; message?: string }>(
        `/api/admin/orders/${selectedOrderId}/shipment/generate-label`,
        { method: "POST" }
      );

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to generate label");
      }

      setActionFeedback({
        type: "success",
        message: res.data?.message || "Shipping label generated",
      });
      await openOrderDetail(selectedOrderId);
      loadOrders();
      if (res.data?.labelUrl) {
        window.open(res.data.labelUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Label generation failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSchedulePickup = async () => {
    if (!selectedOrderId) return;
    setActionLoading("PICKUP");
    setActionFeedback(null);
    try {
      const res = await adminFetch<{ message?: string }>(
        `/api/admin/orders/${selectedOrderId}/shipment/schedule-pickup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pickupDate: pickupDate || undefined }),
        }
      );

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to schedule pickup");
      }

      setActionFeedback({
        type: "success",
        message: res.data?.message || "Pickup scheduled successfully",
      });
      await openOrderDetail(selectedOrderId);
      loadOrders();
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Pickup scheduling failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateManifest = async () => {
    if (!selectedOrderId) return;
    setActionLoading("MANIFEST");
    setActionFeedback(null);
    try {
      const res = await adminFetch<{ manifestUrl?: string; message?: string }>(
        `/api/admin/orders/${selectedOrderId}/shipment/generate-manifest`,
        { method: "POST" }
      );

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to generate manifest");
      }

      setActionFeedback({
        type: "success",
        message: res.data?.message || "Manifest generated successfully",
      });
      await openOrderDetail(selectedOrderId);
      loadOrders();
      if (res.data?.manifestUrl) {
        window.open(res.data.manifestUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Manifest generation failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintManifest = async () => {
    if (!selectedOrderId) return;
    setActionLoading("PRINT_MANIFEST");
    try {
      const res = await adminFetch<{ manifestUrl?: string }>(
        `/api/admin/orders/${selectedOrderId}/shipment/print-manifest`,
        { method: "POST" }
      );

      if (!res.ok || !res.data?.manifestUrl) {
        throw new Error(res.error?.message || "Printable manifest not found");
      }

      window.open(res.data.manifestUrl, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to open manifest");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelAwb = async () => {
    if (!selectedOrderId || !cancelReason.trim()) {
      alert("Please enter a valid cancellation reason.");
      return;
    }

    setActionLoading("CANCEL_AWB");
    setActionFeedback(null);
    try {
      const res = await adminFetch<{ message?: string }>(
        `/api/admin/orders/${selectedOrderId}/shipment/cancel-awb`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: cancelReason.trim() }),
        }
      );

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to cancel AWB");
      }

      setShowCancelModal(false);
      setCancelReason("");
      setActionFeedback({
        type: "success",
        message: res.data?.message || "AWB cancelled. Reassignment blocked for review.",
      });
      await openOrderDetail(selectedOrderId);
      loadOrders();
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Cancellation failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReconcileQuery = async () => {
    if (!selectedOrderId) return;
    setActionLoading("RECONCILE");
    setActionFeedback(null);
    try {
      const res = await adminFetch<{ message?: string }>(
        `/api/admin/orders/${selectedOrderId}/shipment/reconcile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      if (!res.ok) {
        throw new Error(res.error?.message || "Reconciliation query failed");
      }

      setActionFeedback({
        type: "success",
        message: res.data?.message || "Reconciliation query completed",
      });
      await openOrderDetail(selectedOrderId);
      loadOrders();
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Reconciliation query failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceReset = async () => {
    if (!selectedOrderId || !forceResetReason.trim()) {
      alert("A detailed administrative justification reason is required.");
      return;
    }
    if (!confirmRemoteAbsence) {
      alert("You must verify and confirm the order is not actively in transit.");
      return;
    }

    setActionLoading("FORCE_RESET");
    setActionFeedback(null);
    try {
      const res = await adminFetch<{ message?: string }>(
        `/api/admin/orders/${selectedOrderId}/shipment/reconcile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forceReset: true,
            reason: forceResetReason.trim(),
            confirmRemoteAbsence: true,
            evidenceReference: forceResetEvidence.trim() || undefined,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(res.error?.message || "Force reset failed");
      }

      setShowForceResetModal(false);
      setForceResetReason("");
      setForceResetEvidence("");
      setConfirmRemoteAbsence(false);
      setActionFeedback({
        type: "success",
        message: res.data?.message || "Shipment state force-reset successfully.",
      });
      await openOrderDetail(selectedOrderId);
      loadOrders();
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Force reset failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestOverride = async () => {
    if (!selectedOrderId || overrideReason.trim().length < 5) {
      alert("A justification reason of at least 5 characters is required.");
      return;
    }
    if (overrideEvidence.trim().length < 3) {
      alert("An evidence reference (e.g. ticket ID or email thread) is required.");
      return;
    }

    setActionLoading("OVERRIDE_REQUEST");
    setActionFeedback(null);
    try {
      const res = await adminFetch<{ message?: string }>(
        `/api/admin/orders/${selectedOrderId}/shipment/override-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: overrideReason.trim(),
            evidenceReference: overrideEvidence.trim(),
          }),
        }
      );

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to submit override request");
      }

      setShowOverrideModal(false);
      setOverrideReason("");
      setOverrideEvidence("");
      setActionFeedback({
        type: "success",
        message: res.data?.message || "Override request submitted for two-admin review.",
      });
      await openOrderDetail(selectedOrderId);
      loadOrders();
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Override request failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveOverride = async () => {
    if (!selectedOrderId) return;
    if (!confirm("Are you sure you want to approve this emergency override and unblock courier reassignment?")) {
      return;
    }

    setActionLoading("OVERRIDE_APPROVE");
    setActionFeedback(null);
    try {
      const res = await adminFetch<{ message?: string }>(
        `/api/admin/orders/${selectedOrderId}/shipment/approve-override`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewNote: overrideReviewNote.trim() || undefined,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to approve override");
      }

      setOverrideReviewNote("");
      setActionFeedback({
        type: "success",
        message: res.data?.message || "Override approved. Courier reassignment is unlocked.",
      });
      await openOrderDetail(selectedOrderId);
      loadOrders();
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Override approval failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // --- Manual Transition Handlers ---

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setStatusUpdating(true);
    try {
      const res = await adminFetch(`/api/admin/orders/${selectedOrderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          carrier: carrier.trim() || undefined,
          trackingNumber: trackingNumber.trim() || undefined,
          trackingUrl: trackingUrl.trim() || undefined,
          note: statusNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to update order status");
      }

      await openOrderDetail(selectedOrderId);
      loadOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleMarkCodCollected = async () => {
    if (!selectedOrderId) return;
    if (!confirm("Are you sure you want to mark COD cash as collected?")) return;
    setStatusUpdating(true);
    try {
      const res = await adminFetch(
        `/api/admin/orders/${selectedOrderId}/mark-cod-collected`,
        { method: "POST" }
      );
      if (!res.ok) {
        throw new Error(res.error?.message || "Failed to mark COD collected");
      }
      await openOrderDetail(selectedOrderId);
      loadOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setStatusUpdating(false);
    }
  };

  const shipmentState = detailedOrder?.shipment?.shipmentState || "IDLE";
  const requiresReview = detailedOrder?.shipment?.requiresReview || false;
  const isReconciling = shipmentState === "RECONCILIATION_REQUIRED";
  const isReassignmentBlocked = shipmentState === "REASSIGNMENT_BLOCKED";
  const overrideRequest = detailedOrder?.shipment?.overrideRequest;

  // Stepper calculations
  const steps = [
    { key: "ORDER_CREATED", label: "Create Order", num: 1 },
    { key: "AWB_ASSIGNED", label: "Assign AWB", num: 2 },
    { key: "LABEL_GENERATED", label: "Print Label", num: 3 },
    { key: "PICKUP_SCHEDULED", label: "Schedule Pickup", num: 4 },
    { key: "LOGISTICS_READY", label: "Manifest & Dispatch", num: 5 },
  ];

  const getStepStatus = (stepKey: string) => {
    const orderIndex: Record<string, number> = {
      IDLE: 0,
      CREATING_ORDER: 0,
      ORDER_CREATED: 1,
      ASSIGNING_AWB: 1,
      AWB_ASSIGNED: 2,
      GENERATING_LABEL: 2,
      LABEL_GENERATED: 3,
      SCHEDULING_PICKUP: 3,
      PICKUP_SCHEDULED: 4,
      MANIFEST_GENERATING: 4,
      MANIFEST_GENERATED: 5,
      LOGISTICS_READY: 5,
    };
    const currentLvl = orderIndex[shipmentState] || 0;
    const thisLvl = orderIndex[stepKey] || 0;

    if (currentLvl > thisLvl) return "COMPLETED";
    if (currentLvl === thisLvl) return "ACTIVE";
    return "PENDING";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Order Fulfillment & Logistics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end Shiprocket parcel dispatch, courier rate intelligence, AWB assignment, and live scan tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Orders
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Status:</span>
            <select
              value={fulfilmentFilter}
              onChange={(e) => setFulfilmentFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="PACKED">PACKED</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400"
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Channel:</span>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400"
            >
              <option value="ALL">All Channels</option>
              <option value="RETAIL">Retail Direct</option>
              <option value="DISTRIBUTOR">Distributor Wholesale</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order #, customer, phone..."
            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            {loading ? "Loading order records..." : "No orders found matching criteria."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Order ID</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Items</th>
                  <th className="py-3.5 px-6">Total Amount</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6">Logistics & Fulfillment</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-4 px-6">
                      <div className="font-mono font-medium text-white">{o.orderNumber}</div>
                      {o.isDistributorOrder && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            WHOLESALE
                          </span>
                          {o.distributorInfo?.companyName && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
                              {o.distributorInfo.companyName}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-slate-200 font-medium">{o.customerName}</div>
                      <div className="text-slate-500 text-[11px]">{o.customerPhone}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-300 font-medium">
                      {o.itemCount} {o.itemCount === 1 ? "unit" : "units"}
                    </td>
                    <td className="py-4 px-6 font-semibold text-white">
                      {formatPaise(o.totalPaise)}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          o.paymentStatus === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {o.paymentStatus} ({o.paymentMethod})
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              o.fulfilmentStatus === "DELIVERED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : o.fulfilmentStatus === "SHIPPED"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {o.fulfilmentStatus}
                          </span>

                          {/* Shiprocket State Badges */}
                          {o.requiresReview ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                              <AlertCircle className="w-2.5 h-2.5" />
                              REVIEW
                            </span>
                          ) : o.shipmentState === "RECONCILIATION_REQUIRED" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Clock className="w-2.5 h-2.5" />
                              RECONCILING
                            </span>
                          ) : o.shipmentState === "REASSIGNMENT_BLOCKED" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              BLOCKED
                            </span>
                          ) : o.shipmentState === "LOGISTICS_READY" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              READY
                            </span>
                          ) : o.shipmentState === "AWB_ASSIGNED" || o.awbCode ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              AWB
                            </span>
                          ) : null}
                        </div>

                        {(o.awbCode || o.trackingNumber) && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <span>{o.carrier || "Courier"}:</span>
                            <span className="text-slate-200 font-semibold">{o.awbCode || o.trackingNumber}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => openOrderDetail(o.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold transition text-[11px] shadow-sm"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details & Logistics Management Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/40">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-serif font-bold text-xl text-white">
                    Order {detailedOrder?.orderNumber}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      detailedOrder?.fulfilmentStatus === "DELIVERED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {detailedOrder?.fulfilmentStatus}
                  </span>

                  {detailedOrder?.shipment?.shipmentState && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 text-amber-300 border border-slate-700">
                      SR: {detailedOrder.shipment.shipmentState}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Placed on {detailedOrder && new Date(detailedOrder.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {detailLoading || !detailedOrder ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-amber-400" />
                  Loading logistics dossier & status...
                </div>
              ) : (
                <>
                  {/* Action Feedback Banner */}
                  {actionFeedback && (
                    <div
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        actionFeedback.type === "success"
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {actionFeedback.type === "success" ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        )}
                        <span>{actionFeedback.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActionFeedback(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* 1. RECONCILIATION REQUIRED WARNING BANNER */}
                  {isReconciling && (
                    <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <h4 className="font-semibold text-amber-300 text-sm">
                            Ambiguous Operation: Reconciliation Required
                          </h4>
                          <p className="text-slate-300 leading-relaxed text-xs">
                            An outbound Shiprocket request timed out or concluded ambiguously. Normal shipment operations are quarantined to prevent duplicate bookings.
                          </p>
                          {detailedOrder.shipment?.lastError && (
                            <p className="text-amber-200/80 font-mono text-[11px] bg-slate-950/60 p-2 rounded-lg border border-amber-500/20">
                              Error: {detailedOrder.shipment.lastError}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleReconcileQuery}
                          disabled={actionLoading === "RECONCILE"}
                          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold transition text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === "RECONCILE" ? "animate-spin" : ""}`} />
                          Run Remote Reconciliation Query
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowForceResetModal(true)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 transition text-xs flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Administrative Force Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. REASSIGNMENT BLOCKED / TWO-ADMIN OVERRIDE BANNER */}
                  {(isReassignmentBlocked || requiresReview) && (
                    <div className="bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-rose-300 text-sm">
                              Courier Reassignment Locked: Two-Admin Review Protocol
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              {detailedOrder.shipment?.reviewCategory || "INCIDENT"}
                            </span>
                          </div>
                          <p className="text-slate-300 leading-relaxed text-xs">
                            Following a carrier cancellation or incident, automated reassignment is locked under the Two-Person Rule to guarantee no orphaned package is in transit.
                          </p>
                          {detailedOrder.shipment?.reviewReason && (
                            <p className="text-slate-400 text-xs">
                              <strong className="text-slate-200">Incident Reason:</strong> {detailedOrder.shipment.reviewReason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* If override request is currently pending */}
                      {overrideRequest && overrideRequest.status === "PENDING_APPROVAL" ? (
                        <div className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              Emergency Override Pending Approval
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Requested {new Date(overrideRequest.requestedAt).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400">Requested By: </span>
                              <span className="text-slate-200 font-mono">{overrideRequest.requesterAdminEmail}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Evidence Ref: </span>
                              <span className="text-slate-200 font-mono">{overrideRequest.evidenceReference}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400">Justification: </span>
                            <span className="text-slate-200 italic">{overrideRequest.reason}</span>
                          </div>

                          {/* Approval Form for Second Admin */}
                          <div className="pt-2 border-t border-slate-800 space-y-3">
                            <label className="block text-slate-300 text-[11px] font-medium">
                              Second Admin Review Note (optional):
                            </label>
                            <input
                              type="text"
                              value={overrideReviewNote}
                              onChange={(e) => setOverrideReviewNote(e.target.value)}
                              placeholder="Verified courier portal cancellation confirmation..."
                              className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={handleApproveOverride}
                                disabled={actionLoading === "OVERRIDE_APPROVE"}
                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {actionLoading === "OVERRIDE_APPROVE" ? "Approving..." : "Approve Override & Unlock Reassignment"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowOverrideModal(true)}
                            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold transition text-xs flex items-center gap-1.5 shadow-sm"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Request Emergency Override (Admin 1)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer & Shipping Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        Customer Information
                      </div>
                      <div className="text-white font-medium">{detailedOrder.customer.name}</div>
                      <div className="text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {detailedOrder.customer.phone}
                      </div>
                      {detailedOrder.customer.email && (
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {detailedOrder.customer.email}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        Shipping Destination
                      </div>
                      <div className="text-white font-medium">{detailedOrder.shippingAddress.fullName}</div>
                      <div className="text-slate-400">
                        {detailedOrder.shippingAddress.addressLine1}
                        {detailedOrder.shippingAddress.addressLine2 && `, ${detailedOrder.shippingAddress.addressLine2}`}
                      </div>
                      <div className="text-slate-400">
                        {detailedOrder.shippingAddress.city}, {detailedOrder.shippingAddress.state} -{" "}
                        <span className="font-semibold text-amber-300">{detailedOrder.shippingAddress.postalCode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details & COD Banner */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                        Payment Settlement
                      </div>
                      <div className="text-slate-200">
                        Method: <span className="font-semibold text-white">{detailedOrder.paymentMethod}</span> | Status:{" "}
                        <span
                          className={`font-semibold ${
                            detailedOrder.paymentStatus === "PAID" ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {detailedOrder.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {detailedOrder.paymentMethod === "COD" && detailedOrder.paymentStatus === "PENDING" && (
                      <button
                        type="button"
                        onClick={handleMarkCodCollected}
                        disabled={statusUpdating}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50"
                      >
                        Mark COD Cash Collected (₹)
                      </button>
                    )}
                  </div>

                  {/* 3. SHIPROCKET AUTOMATED LOGISTICS HUB */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-amber-400" />
                          <h3 className="font-serif font-bold text-white text-base">Shiprocket Logistics Command Hub</h3>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Automated booking, courier assignment, label generation, pickup dispatch, and tracking.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">Current Lifecycle:</span>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-900 text-amber-400 border border-amber-400/30">
                          {shipmentState}
                        </span>
                      </div>
                    </div>

                    {/* Visual Stepper */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                      {steps.map((st) => {
                        const status = getStepStatus(st.key);
                        return (
                          <div
                            key={st.key}
                            className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                              status === "COMPLETED"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                : status === "ACTIVE"
                                ? "bg-amber-500/10 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30"
                                : "bg-slate-900/40 border-slate-800 text-slate-500"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono font-bold">Step {st.num}</span>
                              {status === "COMPLETED" ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : status === "ACTIVE" ? (
                                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-slate-700" />
                              )}
                            </div>
                            <span className="text-[11px] font-medium truncate">{st.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Parcel Specs & Serviceability Form */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-amber-400" />
                          Parcel Specifications
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Destination PIN: <strong className="text-white">{detailedOrder.shippingAddress.postalCode}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Weight (grams)</label>
                          <input
                            type="number"
                            min={10}
                            max={50000}
                            value={parcelWeightGrams}
                            onChange={(e) => setParcelWeightGrams(parseInt(e.target.value) || 500)}
                            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                          />
                          <span className="text-[9px] text-slate-500 mt-0.5 block">{(parcelWeightGrams / 1000).toFixed(2)} kg</span>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Length (cm)</label>
                          <input
                            type="number"
                            min={1}
                            max={200}
                            value={parcelLengthCm}
                            onChange={(e) => setParcelLengthCm(parseFloat(e.target.value) || 15)}
                            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Breadth (cm)</label>
                          <input
                            type="number"
                            min={1}
                            max={200}
                            value={parcelBreadthCm}
                            onChange={(e) => setParcelBreadthCm(parseFloat(e.target.value) || 10)}
                            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Height (cm)</label>
                          <input
                            type="number"
                            min={1}
                            max={200}
                            value={parcelHeightCm}
                            onChange={(e) => setParcelHeightCm(parseFloat(e.target.value) || 10)}
                            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <button
                          type="button"
                          onClick={handleCheckServiceability}
                          disabled={loadingCouriers}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Search className={`w-3.5 h-3.5 ${loadingCouriers ? "animate-spin text-amber-400" : ""}`} />
                          {loadingCouriers ? "Checking Rates..." : "Check Serviceability & Compare Rates"}
                        </button>

                        {(shipmentState === "IDLE" || shipmentState === "FAILED") && (
                          <button
                            type="button"
                            onClick={handleCreateShipment}
                            disabled={actionLoading === "CREATE" || isReconciling || isReassignmentBlocked}
                            className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                          >
                            <Package className="w-3.5 h-3.5" />
                            {actionLoading === "CREATE" ? "Creating in Shiprocket..." : "Step 1: Create Order in Shiprocket"}
                          </button>
                        )}
                      </div>

                      {serviceabilityError && (
                        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{serviceabilityError}</span>
                        </div>
                      )}

                      {/* Courier Selection Cards */}
                      {couriers.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <div className="text-[11px] font-semibold text-slate-300">
                            Available Courier Partners ({couriers.length}):
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {couriers.map((c) => {
                              const isSelected = selectedCourierId === c.courierCompanyId;
                              return (
                                <div
                                  key={c.courierCompanyId}
                                  onClick={() => setSelectedCourierId(c.courierCompanyId)}
                                  className={`p-3 rounded-xl border cursor-pointer transition relative flex flex-col justify-between ${
                                    isSelected
                                      ? "bg-amber-400/10 border-amber-400 text-white shadow-sm"
                                      : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300"
                                  }`}
                                >
                                  {c.isRecommended && (
                                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-slate-950">
                                      RECOMMENDED
                                    </span>
                                  )}
                                  <div>
                                    <div className="font-semibold text-xs pr-14 text-white truncate">{c.courierName}</div>
                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                      <span>{c.isSurface ? "Surface Cargo" : "Air Express"}</span>
                                      {c.rating && (
                                        <span className="flex items-center gap-0.5 text-amber-300">
                                          <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                                          {c.rating.toFixed(1)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1">
                                      ETA: <span className="text-slate-200">{c.etd || `${c.estimatedDeliveryDays || 3} days`}</span>
                                    </div>
                                  </div>

                                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                                    <div className="font-bold text-amber-400 text-xs">
                                      ₹{c.rate.toFixed(2)}
                                    </div>
                                    {shipmentState === "ORDER_CREATED" && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAssignAwb(c.courierCompanyId);
                                        }}
                                        disabled={actionLoading === `ASSIGN_${c.courierCompanyId}`}
                                        className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                                      >
                                        <Send className="w-2.5 h-2.5" />
                                        Assign AWB
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Assigned AWB Card & Dispatch Lifecycle Actions */}
                    {detailedOrder.shipment?.awbCode ? (
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                Assigned Courier Partner
                              </div>
                              <div className="text-white font-bold text-sm">
                                {detailedOrder.shipment.courierName || "Shiprocket Express"}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-slate-300 font-semibold">{detailedOrder.shipment.awbCode}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyAwb(detailedOrder.shipment!.awbCode!)}
                                  className="text-slate-500 hover:text-amber-400 transition"
                                  title="Copy AWB Number"
                                >
                                  {copiedAwb ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {detailedOrder.shipment.trackingUrl && (
                              <a
                                href={detailedOrder.shipment.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition inline-flex items-center gap-1.5"
                              >
                                <ExternalLink className="w-3 h-3 text-amber-400" />
                                Public Tracking URL
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => setShowCancelModal(true)}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-medium transition"
                            >
                              Cancel AWB
                            </button>
                          </div>
                        </div>

                        {/* Dispatch Action Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* 1. Label Generation */}
                          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                            <div>
                              <div className="text-[10px] text-slate-400 font-semibold uppercase">Step 3: Shipping Label</div>
                              <p className="text-[11px] text-slate-300 mt-1">
                                {detailedOrder.shipment.labelUrl ? "Label ready for printing" : "Not yet generated"}
                              </p>
                            </div>
                            <div className="pt-2">
                              {detailedOrder.shipment.labelUrl ? (
                                <a
                                  href={detailedOrder.shipment.labelUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  Print Shipping Label (PDF)
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleGenerateLabel}
                                  disabled={actionLoading === "LABEL"}
                                  className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition flex items-center justify-center gap-1.5 border border-slate-700 disabled:opacity-50"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  {actionLoading === "LABEL" ? "Generating Label..." : "Generate Label"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 2. Pickup Scheduling */}
                          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                            <div>
                              <div className="text-[10px] text-slate-400 font-semibold uppercase">Step 4: Pickup Dispatch</div>
                              {detailedOrder.shipment.pickupTokenNumber ? (
                                <div className="mt-1 space-y-0.5">
                                  <div className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Pickup Scheduled
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Token: <span className="text-white font-mono">{detailedOrder.shipment.pickupTokenNumber}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-1">
                                  <input
                                    type="date"
                                    value={pickupDate}
                                    onChange={(e) => setPickupDate(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white outline-none"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="pt-2">
                              {!detailedOrder.shipment.pickupTokenNumber && (
                                <button
                                  type="button"
                                  onClick={handleSchedulePickup}
                                  disabled={actionLoading === "PICKUP"}
                                  className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition flex items-center justify-center gap-1.5 border border-slate-700 disabled:opacity-50"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  {actionLoading === "PICKUP" ? "Scheduling..." : "Schedule Pickup"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 3. Manifest */}
                          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                            <div>
                              <div className="text-[10px] text-slate-400 font-semibold uppercase">Step 5: Handover Manifest</div>
                              <p className="text-[11px] text-slate-300 mt-1">
                                {detailedOrder.shipment.manifestUrl ? "Manifest generated" : "Generate handover sheet"}
                              </p>
                            </div>
                            <div className="pt-2">
                              {detailedOrder.shipment.manifestUrl ? (
                                <button
                                  type="button"
                                  onClick={handlePrintManifest}
                                  disabled={actionLoading === "PRINT_MANIFEST"}
                                  className="w-full px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Print Manifest (PDF)
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleGenerateManifest}
                                  disabled={actionLoading === "MANIFEST"}
                                  className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition flex items-center justify-center gap-1.5 border border-slate-700 disabled:opacity-50"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  {actionLoading === "MANIFEST" ? "Generating..." : "Generate Manifest"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* If order is created in Shiprocket but no AWB assigned */
                      shipmentState === "ORDER_CREATED" && (
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                          <div>
                            <div className="text-white font-semibold text-xs">Step 2: Assign Courier Partner</div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Shiprocket order #{detailedOrder.shipment?.shiprocketOrderId || "created"}. Select a courier above or click assign.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAssignAwb()}
                            disabled={!selectedCourierId || actionLoading?.startsWith("ASSIGN")}
                            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {actionLoading?.startsWith("ASSIGN") ? "Assigning..." : "Assign Selected Courier"}
                          </button>
                        </div>
                      )
                    )}

                    {/* Carrier Checkpoint Scan History */}
                    {detailedOrder.shipment?.trackingActivities && detailedOrder.shipment.trackingActivities.length > 0 && (
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Live Carrier Checkpoint History ({detailedOrder.shipment.trackingActivities.length})
                        </div>
                        <div className="space-y-3 pt-2 relative border-l-2 border-slate-800 ml-2 pl-4">
                          {detailedOrder.shipment.trackingActivities.map((act, idx) => (
                            <div key={idx} className="relative">
                              <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-950" />
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-white text-xs">{act.status}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(act.date).toLocaleString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-slate-300 text-xs mt-0.5">{act.activity}</p>
                              {act.location && (
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" />
                                  {act.location}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Items */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 font-semibold text-slate-300">
                      Purchased Items ({detailedOrder.items.length})
                    </div>
                    <div className="divide-y divide-slate-800/60">
                      {detailedOrder.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="p-4 flex items-center justify-between gap-4 bg-slate-900/40"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden relative shrink-0">
                              {it.imageUrl ? (
                                <Image
                                  src={it.imageUrl}
                                  alt={it.name}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                  <ShoppingBag className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-white font-medium">{it.name}</div>
                              <div className="text-slate-500 text-[11px]">
                                {it.sizeLabel} • Qty: {it.quantity} × {formatPaise(it.effectivePricePaise)}
                              </div>
                            </div>
                          </div>
                          <div className="font-semibold text-white">
                            {formatPaise(it.lineTotalPaise)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-950/80 p-4 space-y-1.5 border-t border-slate-800">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal:</span>
                        <span>{formatPaise(detailedOrder.subtotalPaise)}</span>
                      </div>
                      {detailedOrder.discountPaise > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Discount Applied:</span>
                          <span>- {formatPaise(detailedOrder.discountPaise)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400">
                        <span>Shipping Fee:</span>
                        <span>
                          {detailedOrder.shippingPaise === 0
                            ? "FREE"
                            : formatPaise(detailedOrder.shippingPaise)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Estimated Tax (GST):</span>
                        <span>{formatPaise(detailedOrder.taxPaise)}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-800">
                        <span>Grand Total:</span>
                        <span className="text-amber-400">
                          {formatPaise(detailedOrder.totalPaise)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Manual Fulfillment Status Fallback */}
                  <form
                    onSubmit={handleStatusTransition}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4"
                  >
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-400" />
                      Manual Status & Carrier Override (Fallback)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          Transition Status To
                        </label>
                        <select
                          value={nextStatus}
                          onChange={(e) => setNextStatus(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                        >
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="PACKED">PACKED</option>
                          <option value="SHIPPED">SHIPPED</option>
                          <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          Logistics Carrier Name
                        </label>
                        <input
                          type="text"
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          placeholder="Delhivery / Blue Dart / Shiprocket"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          Tracking AWB Number
                        </label>
                        <input
                          type="text"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="AWB123456789"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          Public Tracking URL (optional)
                        </label>
                        <input
                          type="url"
                          value={trackingUrl}
                          onChange={(e) => setTrackingUrl(e.target.value)}
                          placeholder="https://delhivery.com/track/..."
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Internal Status Note / Reason
                      </label>
                      <input
                        type="text"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder="Dispatched from Mumbai warehouse hub"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 outline-none"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={statusUpdating}
                        className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold transition disabled:opacity-50 flex items-center gap-2 border border-slate-700"
                      >
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                        {statusUpdating ? "Saving..." : "Save Manual Transition"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Force Reset Modal */}
      {showForceResetModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <RotateCcw className="w-4 h-4" />
                Administrative Force Reset
              </div>
              <button
                type="button"
                onClick={() => setShowForceResetModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action resets the quarantined state to <strong>FAILED</strong>, permitting a fresh shipment creation attempt. You must verify that the order does not exist remotely on Shiprocket.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Mandatory Justification Reason:
                </label>
                <textarea
                  value={forceResetReason}
                  onChange={(e) => setForceResetReason(e.target.value)}
                  placeholder="Checked Shiprocket panel; no order created for this ID..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Evidence Reference (Ticket # / Log reference):
                </label>
                <input
                  type="text"
                  value={forceResetEvidence}
                  onChange={(e) => setForceResetEvidence(e.target.value)}
                  placeholder="SR-PANEL-CHECK-20261108"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={confirmRemoteAbsence}
                  onChange={(e) => setConfirmRemoteAbsence(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-amber-400 focus:ring-amber-400"
                />
                <span className="text-slate-300 text-[11px] leading-snug">
                  I confirm that I have checked the Shiprocket dashboard and verified that no active shipment exists for this order.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowForceResetModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForceReset}
                disabled={actionLoading === "FORCE_RESET" || !forceResetReason.trim() || !confirmRemoteAbsence}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
              >
                {actionLoading === "FORCE_RESET" ? "Resetting..." : "Confirm Force Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Override Request Modal (Step 1 of Two-Admin rule) */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <ShieldCheck className="w-4 h-4" />
                Request Emergency Override (Admin 1)
              </div>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Submitting this request alerts a secondary manager to review and authorize courier reassignment under the Two-Person Rule.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Justification Reason:
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Carrier driver reported non-serviceable pin; confirmed package returned to warehouse..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Evidence Reference (Ticket # or Courier Email Thread):
                </label>
                <input
                  type="text"
                  value={overrideEvidence}
                  onChange={(e) => setOverrideEvidence(e.target.value)}
                  placeholder="SR-SUPPORT-TICKET-88912"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestOverride}
                disabled={actionLoading === "OVERRIDE_REQUEST" || overrideReason.trim().length < 5 || overrideEvidence.trim().length < 3}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition disabled:opacity-50"
              >
                {actionLoading === "OVERRIDE_REQUEST" ? "Submitting..." : "Submit Override Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AWB Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <AlertCircle className="w-4 h-4" />
                Cancel Assigned AWB
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Cancelling the AWB informs Shiprocket and blocks immediate automated courier reassignment. A two-admin override will be required before another courier can be booked.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Cancellation Reason:
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Customer requested address change prior to pickup..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-2.5 text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelAwb}
                disabled={actionLoading === "CANCEL_AWB" || cancelReason.trim().length < 5}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
              >
                {actionLoading === "CANCEL_AWB" ? "Cancelling..." : "Confirm AWB Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
