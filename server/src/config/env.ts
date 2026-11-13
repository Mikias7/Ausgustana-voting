import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const PLACEHOLDER = "CHANGE_ME";

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.string().url(),
    TEST_DATABASE_URL: z.string().url().optional(),
    SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
    // "dev" = sign-in-as picker. "disabled" = no sign-in at all (until real SSO
    // is added, this is the only mode production can start with).
    AUTH_MODE: z.enum(["dev", "disabled"]).default("dev"),
    ALLOWED_EMAIL_DOMAINS: z
      .string()
      .default("ole.augie.edu,augie.edu")
      .transform((value) =>
        value
          .split(",")
          .map((domain) => domain.trim().toLowerCase())
          .filter(Boolean),
      )
      .pipe(z.array(z.string()).min(1, "ALLOWED_EMAIL_DOMAINS must list at least one domain")),
    CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    if (env.AUTH_MODE === "dev") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_MODE"],
        message: "AUTH_MODE=dev is not allowed when NODE_ENV=production",
      });
    }
    if (env.SESSION_SECRET.length < 32 || env.SESSION_SECRET.includes(PLACEHOLDER)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SESSION_SECRET"],
        message: "SESSION_SECRET must be a random string of at least 32 characters in production",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Validates an environment object. Throws a readable Error listing every problem. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(env)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server configuration:\n${problems}`);
  }
  return result.data;
}

let cached: Env | undefined;

/**
 * Loads server/.env (resolved from the working directory, which is server/
 * for every npm script and should be the systemd WorkingDirectory) and
 * validates process.env. Real environment variables win over the file.
 */
export function getEnv(): Env {
  if (!cached) {
    dotenv.config({ path: path.resolve(process.cwd(), ".env") });
    cached = parseEnv(process.env);
  }
  return cached;
}
