import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // HTTP
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Institution
  INSTITUTION_DID: z.string().min(1),
  INSTITUTION_NAME: z.string().min(1),
  INSTITUTION_DOMAIN: z.string().min(1),

  // Signing key
  INSTITUTION_SIGNING_KEY_BASE64: z.string().min(1),
  INSTITUTION_SIGNING_KEY_ID: z.string().min(1),
  INSTITUTION_SIGNING_ALG: z.string().default('ES256'),

  // Blockchain
  BLOCKCHAIN_RPC_URL: z.string().url(),
  BLOCKCHAIN_CHAIN_ID: z.coerce.number().int().positive(),
  SBT_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  ISSUER_WALLET_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Holder auth
  HOLDER_CHALLENGE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  HOLDER_SESSION_EXPIRES_IN: z.string().default('30d'),

  // SD-JWT
  SD_JWT_DECOY_COUNT: z.coerce.number().int().min(0).default(3),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
