"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";

interface WishlistContextType {
  wishlistIds: string[];
  wishlistCount: number;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  addToWishlist: (productId: string) => Promise<void>;
  isLoaded: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = "niyat_wishlist_v1";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Initial load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setWishlistIds(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load wishlist from storage", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. Sync with user profile when logged in
  useEffect(() => {
    if (user && profile && Array.isArray(profile.wishlist)) {
      setWishlistIds((prevLocal) => {
        const serverIds = profile.wishlist.map(String);
        // Union of local guest items and server items
        const combined = Array.from(new Set([...serverIds, ...prevLocal]));
        try {
          localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(combined));
        } catch {
          // ignore storage error
        }
        return combined;
      });
    }
  }, [user, profile]);

  // 3. Save to localStorage on change
  const saveToStorage = useCallback((ids: string[]) => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {
      console.error("Failed to save wishlist to storage", e);
    }
  }, []);

  const isWishlisted = useCallback(
    (productId: string) => wishlistIds.includes(productId),
    [wishlistIds]
  );

  const addToWishlist = useCallback(
    async (productId: string) => {
      setWishlistIds((prev) => {
        if (prev.includes(productId)) return prev;
        const updated = [...prev, productId];
        saveToStorage(updated);
        return updated;
      });

      if (user) {
        try {
          await fetch("/api/me/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });
          refreshProfile();
        } catch (err) {
          console.error("Failed to sync wishlist to server", err);
        }
      }
    },
    [user, saveToStorage, refreshProfile]
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      setWishlistIds((prev) => {
        const updated = prev.filter((id) => id !== productId);
        saveToStorage(updated);
        return updated;
      });

      if (user) {
        try {
          await fetch(`/api/me/wishlist/${productId}`, {
            method: "DELETE",
          });
          refreshProfile();
        } catch (err) {
          console.error("Failed to remove wishlist from server", err);
        }
      }
    },
    [user, saveToStorage, refreshProfile]
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (wishlistIds.includes(productId)) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId);
      }
    },
    [wishlistIds, addToWishlist, removeFromWishlist]
  );

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistCount: wishlistIds.length,
        isWishlisted,
        toggleWishlist,
        addToWishlist,
        removeFromWishlist,
        isLoaded,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
