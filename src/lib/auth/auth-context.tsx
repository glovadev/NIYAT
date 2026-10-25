"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import {
  auth,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  logoutUser,
} from "@/lib/firebase/client";

export interface UserProfileData {
  id: string;
  firebaseUid: string;
  name: string;
  email?: string;
  phone?: string;
  role: "CUSTOMER" | "STAFF" | "ADMIN";
  wishlist: string[];
}

interface AuthContextType {
  user: User | null;
  profile: UserProfileData | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const syncSession = useCallback(async (firebaseUser: User | null) => {
    if (firebaseUser) {
      try {
        const idToken = await firebaseUser.getIdToken();
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        const data = await res.json();
        if (data.success && data.data?.profile) {
          setProfile(data.data.profile);
        }
      } catch (err) {
        console.error("Failed to sync session cookie:", err);
      }
    } else {
      setProfile(null);
      try {
        await fetch("/api/auth/session", { method: "DELETE" });
      } catch (err) {
        console.error("Failed to clear session:", err);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      await syncSession(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncSession]);

  const handleLoginWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmail(email, pass);
    await syncSession(cred.user);
  };

  const handleSignupWithEmail = async (email: string, pass: string, name?: string) => {
    const cred = await signUpWithEmail(email, pass, name);
    await syncSession(cred.user);
  };

  const handleLoginWithGoogle = async () => {
    const cred = await signInWithGoogle();
    await syncSession(cred.user);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setProfile(null);
    await fetch("/api/auth/session", { method: "DELETE" });
  };

  const refreshProfile = async () => {
    if (user) {
      await syncSession(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        loginWithEmail: handleLoginWithEmail,
        signupWithEmail: handleSignupWithEmail,
        loginWithGoogle: handleLoginWithGoogle,
        logout: handleLogout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
