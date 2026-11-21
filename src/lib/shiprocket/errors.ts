export abstract class ShiprocketError extends Error {
  abstract readonly isRetryable: boolean;
  readonly statusCode: number;
  readonly endpoint?: string;
  readonly details?: unknown;

  constructor(message: string, statusCode: number, endpoint?: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.details = details;
  }
}

export class ShiprocketConfigError extends ShiprocketError {
  readonly isRetryable = false;
  constructor(message: string) {
    super(message, 0);
  }
}

export class ShiprocketAuthError extends ShiprocketError {
  readonly isRetryable = false;
  constructor(message: string, endpoint?: string, details?: unknown) {
    super(message, 401, endpoint, details);
  }
}

export class ShiprocketForbiddenError extends ShiprocketError {
  readonly isRetryable = false;
  constructor(message: string, endpoint?: string, details?: unknown) {
    super(message, 403, endpoint, details);
  }
}

export class ShiprocketNotFoundError extends ShiprocketError {
  readonly isRetryable = false;
  constructor(message: string, endpoint?: string, details?: unknown) {
    super(message, 404, endpoint, details);
  }
}

export class ShiprocketConflictError extends ShiprocketError {
  readonly isRetryable = false;
  constructor(message: string, endpoint?: string, details?: unknown) {
    super(message, 409, endpoint, details);
  }
}

export class ShiprocketValidationError extends ShiprocketError {
  readonly isRetryable = false;
  constructor(message: string, statusCode: number = 422, endpoint?: string, details?: unknown) {
    super(message, statusCode, endpoint, details);
  }
}

export class ShiprocketRateLimitError extends ShiprocketError {
  readonly isRetryable = true;
  readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number = 5, endpoint?: string, details?: unknown) {
    super(message, 429, endpoint, details);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ShiprocketServerError extends ShiprocketError {
  readonly isRetryable = true;
  constructor(message: string, statusCode: number = 500, endpoint?: string, details?: unknown) {
    super(message, statusCode, endpoint, details);
  }
}

export class ShiprocketTimeoutError extends ShiprocketError {
  readonly isRetryable = true;
  constructor(message: string, endpoint?: string) {
    super(message, 408, endpoint);
  }
}

export function classifyShiprocketHttpError(
  status: number,
  data: unknown,
  endpoint: string,
  headers?: Headers
): ShiprocketError {
  const extractMessage = (): string => {
    if (typeof data === "object" && data !== null) {
      const record = data as Record<string, unknown>;
      if (typeof record.message === "string") return record.message;
      if (typeof record.error === "string") return record.error;
      if (record.errors && typeof record.errors === "object") {
        return JSON.stringify(record.errors);
      }
    }
    return `Shiprocket API request to ${endpoint} failed with HTTP ${status}`;
  };

  const message = extractMessage();

  switch (status) {
    case 401:
      return new ShiprocketAuthError(message, endpoint, data);
    case 403:
      return new ShiprocketForbiddenError(message, endpoint, data);
    case 404:
      return new ShiprocketNotFoundError(message, endpoint, data);
    case 409:
      return new ShiprocketConflictError(message, endpoint, data);
    case 400:
    case 422:
      return new ShiprocketValidationError(message, status, endpoint, data);
    case 429: {
      const retryAfterHeader = headers?.get("retry-after");
      const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) || 5 : 5;
      return new ShiprocketRateLimitError(message, retryAfterSeconds, endpoint, data);
    }
    case 500:
    case 502:
    case 503:
    case 504:
      return new ShiprocketServerError(message, status, endpoint, data);
    default:
      if (status >= 400 && status < 500) {
        return new ShiprocketValidationError(message, status, endpoint, data);
      }
      return new ShiprocketServerError(message, status, endpoint, data);
  }
}

