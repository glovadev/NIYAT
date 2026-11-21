export interface ShiprocketCredentials {
  email: string;
  password: string;
}

export interface ShiprocketConfig {
  email: string;
  password: string;
  defaultPickupLocation?: string;
  warehousePin?: string;
  webhookSecret?: string;
  baseUrl: string;
  requestTimeoutMs: number;
  maxRetries: number;
}

export interface ShiprocketAuthTokenResponse {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  company_id?: number;
  created_at?: string;
  token: string;
}

export interface CachedToken {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export interface ShiprocketRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  allowRetry?: boolean;
  maxRetries?: number;
}

export interface ShiprocketResponse<T = unknown> {
  status: number;
  headers: Headers;
  data: T;
}

