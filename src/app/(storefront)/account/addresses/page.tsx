"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import {
  MapPin,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

interface AddressItem {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export default function CustomerAddressesPage() {
  const { user, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);

  // Form fields
  const [label, setLabel] = useState("Home");
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = () => {
    setLoading(true);
    fetch("/api/me/addresses")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.items) {
          setAddresses(data.data.items);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) {
      fetchAddresses();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const openAddModal = () => {
    setEditingAddress(null);
    setLabel("Home");
    setRecipientName(user?.displayName || "");
    setPhone("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setState("");
    setPostalCode("");
    setIsDefault(addresses.length === 0);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (addr: AddressItem) => {
    setEditingAddress(addr);
    setLabel(addr.label || "Home");
    setRecipientName(addr.recipientName);
    setPhone(addr.phone);
    setAddressLine1(addr.addressLine1);
    setAddressLine2(addr.addressLine2 || "");
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
    setIsDefault(addr.isDefault);
    setError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      label,
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      isDefault,
    };

    try {
      const url = editingAddress
        ? `/api/me/addresses/${editingAddress.id}`
        : "/api/me/addresses";
      const method = editingAddress ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save address");
      }

      setIsModalOpen(false);
      fetchAddresses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving address";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this delivery address?")) return;

    try {
      const res = await fetch(`/api/me/addresses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchAddresses();
      }
    } catch {
      alert("Failed to delete address");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-niyat-gold border-t-niyat-emerald rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs uppercase tracking-widest text-niyat-gold">
          Loading Saved Addresses...
        </p>
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
          <Link href="/account" className="hover:text-niyat-emerald transition-colors">
            My Account
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-niyat-charcoal font-medium">Saved Addresses</span>
        </nav>

        {/* Header */}
        <div className="border-b border-niyat-ivory-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-niyat-gold font-semibold">
              Delivery Logistics
            </span>
            <h1 className="font-serif text-3xl font-bold text-niyat-charcoal mt-1">
              Saved Delivery Addresses
            </h1>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-niyat-emerald text-white text-xs font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-niyat-gold" /> Add New Address
          </button>
        </div>

        {/* Address Cards Grid */}
        {addresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`bg-white rounded-3xl p-6 border transition-all relative flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                  addr.isDefault
                    ? "border-niyat-emerald ring-1 ring-niyat-emerald"
                    : "border-niyat-ivory-border"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-niyat-ivory border border-niyat-ivory-border text-niyat-charcoal">
                      {addr.label}
                    </span>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-niyat-emerald font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Default Address
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-niyat-charcoal">
                      {addr.recipientName}
                    </h3>
                    <p className="text-xs text-niyat-muted mt-0.5">Phone: +91 {addr.phone}</p>
                  </div>

                  <p className="text-xs text-niyat-charcoal/80 leading-relaxed font-light">
                    {addr.addressLine1}
                    {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                    <br />
                    {addr.city}, {addr.state} - {addr.postalCode}
                  </p>
                </div>

                <div className="pt-4 border-t border-niyat-ivory-border flex items-center justify-between text-xs">
                  <button
                    onClick={() => openEditModal(addr)}
                    className="text-niyat-gold-dark hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>

                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="text-red-500 hover:text-red-700 font-medium inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-niyat-ivory-border max-w-xl mx-auto space-y-4 px-6">
            <MapPin className="w-12 h-12 text-niyat-gold mx-auto" />
            <h3 className="font-serif text-xl font-bold text-niyat-charcoal">
              No Addresses Saved Yet
            </h3>
            <p className="text-xs text-niyat-muted">
              Add your preferred residential or office delivery address for express checkout.
            </p>
            <div className="pt-2">
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-niyat-emerald text-white text-xs font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark transition-all"
              >
                <Plus className="w-4 h-4 text-niyat-gold" /> Add Your First Address
              </button>
            </div>
          </div>
        )}

        {/* Add/Edit Address Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl border border-niyat-ivory-border max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-niyat-ivory-border">
                <h3 className="font-serif text-xl font-bold text-niyat-charcoal">
                  {editingAddress ? "Edit Address" : "Add Delivery Address"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-niyat-muted hover:text-niyat-charcoal text-lg"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                      Address Label
                    </label>
                    <select
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-niyat-ivory-border text-xs text-niyat-charcoal focus:outline-none focus:border-niyat-gold bg-white"
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      required
                      placeholder="Full Name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-niyat-ivory-border text-xs text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                    10-Digit Mobile Number
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
                      className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-niyat-ivory-border text-xs text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                    />
                  </div>
                </div>

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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-niyat-ivory-border text-xs text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-niyat-ivory-border text-xs text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-niyat-ivory-border text-xs text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-niyat-ivory-border text-xs text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-niyat-ivory-border text-xs text-niyat-charcoal focus:outline-none focus:border-niyat-gold"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-niyat-emerald border-niyat-ivory-border focus:ring-niyat-gold"
                  />
                  <span className="text-xs text-niyat-charcoal">Set as default delivery address</span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-niyat-ivory-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-full text-xs text-niyat-muted hover:text-niyat-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-7 py-2.5 rounded-full bg-niyat-emerald text-white text-xs font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark disabled:opacity-50 transition-all shadow-md"
                  >
                    {submitting ? "Saving..." : "Save Address"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
