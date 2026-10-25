"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { X, Sparkles, AlertCircle, CheckCircle2, Lock, Mail, User } from "lucide-react";
import { resetPassword } from "@/lib/firebase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
}: AuthModalProps) {
  const { loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await loginWithEmail(email.trim(), password);
        onClose();
      } else if (mode === "signup") {
        if (!name.trim()) {
          throw new Error("Please enter your name");
        }
        await signupWithEmail(email.trim(), password, name.trim());
        onClose();
      } else if (mode === "forgot") {
        await resetPassword(email.trim());
        setResetSent(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      // Clean up Firebase error codes for customer display
      if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password")) {
        setError("Invalid email or password. Please verify your details.");
      } else if (msg.includes("auth/email-already-in-use")) {
        setError("An account already exists with this email. Please sign in.");
      } else if (msg.includes("auth/weak-password")) {
        setError("Password should be at least 6 characters.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in was cancelled";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-niyat-ivory-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-niyat-muted hover:text-niyat-charcoal hover:bg-niyat-ivory transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-niyat-gold-subtle border border-niyat-gold/30 text-niyat-gold-dark text-[11px] font-semibold uppercase tracking-widest">
            <Sparkles className="w-3 h-3 text-niyat-gold" />
            NIYAT Sanctuary
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-niyat-charcoal">
            {mode === "login" && "Welcome Back"}
            {mode === "signup" && "Create Your Account"}
            {mode === "forgot" && "Reset Password"}
          </h3>
          <p className="text-xs text-niyat-muted">
            {mode === "login" && "Access your curated skincare rituals and order tracking."}
            {mode === "signup" && "Join our circle for bespoke recommendations and order privileges."}
            {mode === "forgot" && "Enter your email to receive a password reset link."}
          </p>
        </div>

        {/* Google One-Tap / Social Button (for login & signup) */}
        {mode !== "forgot" && (
          <div className="space-y-4 mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl border border-niyat-ivory-border bg-white hover:bg-neutral-50 text-xs sm:text-sm font-semibold text-niyat-charcoal flex items-center justify-center gap-3 shadow-sm transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.16C3.26 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.4l4-3.16z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.27 6.6l4 3.16c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-niyat-ivory-border w-full" />
              <span className="bg-white px-3 text-[11px] text-niyat-muted uppercase tracking-wider select-none">
                or with email
              </span>
              <div className="border-t border-niyat-ivory-border w-full" />
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Reset Confirmation */}
        {resetSent ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-3 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
            <p>Password reset instructions have been sent to your email.</p>
            <button
              onClick={() => {
                setResetSent(false);
                setMode("login");
              }}
              className="text-xs font-semibold text-niyat-emerald underline"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-niyat-muted absolute left-3.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal placeholder:text-niyat-muted focus:outline-none focus:border-niyat-gold focus:ring-1 focus:ring-niyat-gold"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-niyat-muted absolute left-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal placeholder:text-niyat-muted focus:outline-none focus:border-niyat-gold focus:ring-1 focus:ring-niyat-gold"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-niyat-charcoal">
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setMode("forgot");
                      }}
                      className="text-[11px] text-niyat-gold-dark hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-niyat-muted absolute left-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-niyat-ivory-border text-xs sm:text-sm text-niyat-charcoal placeholder:text-niyat-muted focus:outline-none focus:border-niyat-gold focus:ring-1 focus:ring-niyat-gold"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-niyat-emerald text-white text-xs sm:text-sm font-semibold uppercase tracking-wider hover:bg-niyat-emerald-dark transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : mode === "login" ? (
                "Sign In"
              ) : mode === "signup" ? (
                "Create Account"
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        )}

        {/* Modal Footer Mode Switch */}
        <div className="mt-6 pt-4 border-t border-niyat-ivory-border text-center text-xs text-niyat-muted">
          {mode === "login" && (
            <p>
              Don&apos;t have an account yet?{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("signup");
                }}
                className="font-semibold text-niyat-emerald hover:underline"
              >
                Create one now
              </button>
            </p>
          )}

          {mode === "signup" && (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("login");
                }}
                className="font-semibold text-niyat-emerald hover:underline"
              >
                Sign In
              </button>
            </p>
          )}

          {mode === "forgot" && (
            <p>
              Remembered your password?{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("login");
                }}
                className="font-semibold text-niyat-emerald hover:underline"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
