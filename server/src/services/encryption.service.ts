import crypto from 'crypto';
import { env } from '../config/environment.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Encrypt sensitive data (like API keys) using AES-256-GCM
 */
export function encrypt(plaintext: string): { encrypted: string; iv: string; tag: string } {
    const key = Buffer.from(env.ENCRYPTION_MASTER_KEY, 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
    };
}

/**
 * Decrypt data encrypted with encrypt()
 */
export function decrypt(encrypted: string, iv: string, tag: string): string {
    const key = Buffer.from(env.ENCRYPTION_MASTER_KEY, 'hex');
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
    decipher.setAuthTag(tagBuffer);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Generate a secure random token (for verification, password reset, etc.)
 */
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token for storage (don't store raw tokens)
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}
