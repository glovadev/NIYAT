import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z
    .string({
      required_error: "MONGODB_URI environment variable is required in .env.local",
    })
    .min(1, "MONGODB_URI cannot be empty")
    .refine(
      (val) => val.startsWith("mongodb://") || val.startsWith("mongodb+srv://"),
      {
        message: "MONGODB_URI must start with mongodb:// or mongodb+srv://",
      }
    ),
  SITE_URL: z.string().url().default("http://localhost:3000"),
  JWT_SECRET: z.string().default("niyat_jwt_secret_dev_key_2026_983748293472"),
  FIREBASE_PROJECT_ID: z.string().default("niyat-29baf"),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
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
