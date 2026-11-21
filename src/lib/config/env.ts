import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  MONGODB_URI: z.string().default(""),
  SITE_URL: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().default("niyat_jwt_secret_dev_key_2026_983748293472"),
  FIREBASE_PROJECT_ID: z.string().default("niyat-29baf"),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  // Shiprocket logistics configuration (Optional for normal application startup)
  SHIPROCKET_API_EMAIL: z.string().email().optional(),
  SHIPROCKET_API_PASSWORD: z.string().min(6).optional(),
  SHIPROCKET_DEFAULT_PICKUP_LOCATION: z.string().optional(),
  SHIPROCKET_WAREHOUSE_PIN: z
    .string()
    .regex(/^\d{6}$/, "Must be a 6-digit Indian PIN code")
    .optional(),
  SHIPROCKET_WEBHOOK_SECRET: z.string().min(8).optional(),
  LOGISTICS_CRON_SECRET: z.string().min(8).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function validateServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    const errorDetails = Object.entries(formatted)
      .filter(([key]) => key !== "_errors")
      .map(([key, value]) => ` - ${key}: ${(value as { _errors: string[] })?._errors?.join(", ")}`)
      .join("\n");

    throw new Error(
      `\n❌ Invalid server environment configuration:\n${errorDetails}\n`
    );
  }

  return result.data;
}

export const serverEnv = validateServerEnv();
