import "server-only";
import jwt from "jsonwebtoken";
import { serverEnv } from "@/lib/config/env";

export interface GuestOrderPayload {
  orderId: string;
  orderNumber: string;
  phone: string;
}

export function generateGuestOrderToken(payload: GuestOrderPayload): string {
  return jwt.sign(payload, serverEnv.JWT_SECRET, {
    expiresIn: "30d",
  });
}

export function verifyGuestOrderToken(token: string): GuestOrderPayload | null {
  try {
    return jwt.verify(token, serverEnv.JWT_SECRET) as GuestOrderPayload;
  } catch {
    return null;
  }
}
