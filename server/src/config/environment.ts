import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, '../..', envFile) });

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // JWT
    JWT_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),

    // Encryption
    ENCRYPTION_MASTER_KEY: z.string().min(32),

    // Supabase Storage
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_KEY: z.string().min(10),

    // Payment (optional for Phase 1)
    MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),

    // Email (optional for Phase 1)
    RESEND_API_KEY: z.string().optional(),
    FROM_EMAIL: z.string().email().optional(),

    // AI
    GOOGLE_GENAI_API_KEY: z.string().min(1),
    GOOGLE_CLOUD_PROJECT_ID: z.string().min(1),

    // App
    APP_URL: z.string().url().default('http://localhost:5173'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('❌ Invalid environment variables:');
        console.error(parsed.error.flatten().fieldErrors);
        process.exit(1);
    }

    return parsed.data;
}

export const env = validateEnv();
