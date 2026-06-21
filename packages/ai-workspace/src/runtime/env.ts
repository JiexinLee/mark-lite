import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

loadEnvFiles();

const AIWorkspaceRuntimeEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  CLIENT_ORIGIN: z.string().default("http://127.0.0.1:5173"),
  DEFAULT_USER_ID: z.string().default("demo-user"),
  AI_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .transform((value: "true" | "false" | undefined) => value !== "false"),
  AI_PROVIDER: z.enum(["openai", "custom"]).default("openai"),
  AI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  AI_MODEL: z.string().default("gpt-4.1-mini"),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(2048),
  OPENAI_API_KEY: z.string().optional(),
});

export type AIWorkspaceRuntimeEnv = z.infer<typeof AIWorkspaceRuntimeEnvSchema>;

export const aiWorkspaceRuntimeEnv = AIWorkspaceRuntimeEnvSchema.parse(
  process.env,
);

function loadEnvFiles() {
  const packageRoot = path.resolve(__dirname, "..", "..");
  const workspaceRoot = path.resolve(packageRoot, "..", "..");
  const candidates = [
    path.resolve(workspaceRoot, ".env"),
    path.resolve(workspaceRoot, ".env.local"),
    path.resolve(packageRoot, ".env"),
    path.resolve(packageRoot, ".env.local"),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: false });
    }
  }
}
