import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats an amount in integer paise to INR currency string.
 * Example: 59900 -> "₹599" or "₹599.00"
 */
export function formatPaise(paise: number, showDecimals = false): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(rupees);
}

/**
 * Calculates discount percentage between regular and sale prices in paise.
 */
export function calculateDiscountPercent(regularPaise: number, salePaise: number): number {
  if (regularPaise <= 0 || salePaise >= regularPaise) return 0;
  return Math.round(((regularPaise - salePaise) / regularPaise) * 100);
}
