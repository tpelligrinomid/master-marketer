import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("10000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ANTHROPIC_API_KEY: z.string().min(1),
  TRIGGER_SECRET_KEY: z.string().min(1),
  API_KEY: z.string().min(1),
  // Research pipeline data sources
  FIRECRAWL_API_KEY: z.string().optional(),
  MOZ_API_KEY: z.string().optional(),
  APIFY_API_KEY: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  SPYFU_API_ID: z.string().optional(),
  SPYFU_API_KEY: z.string().optional(),
  SPYFU_PROXY_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error("Invalid environment variables:", result.error.format());
      process.exit(1);
    }
    _env = result.data;
  }
  return _env;
}
