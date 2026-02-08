import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { env } from '../config/environment.js';
import { generateSecureToken, hashToken } from './encryption.service.js';

const BCRYPT_ROUNDS = 12;

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

export interface AuthResult {
    token: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        role: string;
        emailVerified: boolean;
    };
}

export class AuthService {
    /**
     * Register a new user
     */
    async register(email: string, password: string): Promise<{ userId: string; email: string }> {
        // Check if user exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new Error('Email already registered');
        }

        // Validate password strength
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Generate verification token
        const verificationToken = generateSecureToken();
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user with profile and credits
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase().trim(),
                passwordHash,
                verificationToken: hashToken(verificationToken),
                verificationTokenExpires,
                profile: {
                    create: {},
                },
                credits: {
                    create: {},
                },
            },
            include: {
                profile: true,
                credits: true,
            },
        });

        // TODO: Send verification email with verificationToken

        return { userId: user.id, email: user.email };
    }

    /**
     * Login a user
     */
    async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
        // Find user
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check if active
        if (!user.isActive) {
            throw new Error('Account is inactive');
        }

        // Verify password
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            throw new Error('Invalid credentials');
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // Generate tokens
        const payload: JWTPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };

        const token = jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_ACCESS_EXPIRY as any,
        });

        const refreshToken = jwt.sign(
            { userId: user.id, type: 'refresh' },
            env.JWT_SECRET,
            { expiresIn: env.JWT_REFRESH_EXPIRY as any }
        );

        // Create session
        await prisma.session.create({
            data: {
                userId: user.id,
                tokenHash: hashToken(token),
                refreshTokenHash: hashToken(refreshToken),
                ipAddress,
                userAgent,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
        });

        return {
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                emailVerified: user.emailVerified,
            },
        };
    }

    /**
     * Verify email with token
     */
    async verifyEmail(token: string): Promise<{ success: boolean }> {
        const hashedToken = hashToken(token);

        const user = await prisma.user.findFirst({
            where: {
                verificationToken: hashedToken,
                verificationTokenExpires: { gte: new Date() },
            },
        });

        if (!user) {
            throw new Error('Invalid or expired token');
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
                verificationTokenExpires: null,
            },
        });

        return { success: true };
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email: string): Promise<{ success: boolean }> {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            // Don't reveal if email exists
            return { success: true };
        }

        const resetToken = generateSecureToken();
        const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: hashToken(resetToken),
                resetTokenExpires,
            },
        });

        // TODO: Send reset email with resetToken

        return { success: true };
    }

    /**
     * Reset password with token
     */
    async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
        if (newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        const hashedToken = hashToken(token);

        const user = await prisma.user.findFirst({
            where: {
                resetToken: hashedToken,
                resetTokenExpires: { gte: new Date() },
            },
        });

        if (!user) {
            throw new Error('Invalid or expired token');
        }

        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetToken: null,
                resetTokenExpires: null,
            },
        });

        // Invalidate all sessions
        await prisma.session.updateMany({
            where: { userId: user.id },
            data: {
                isActive: false,
                revokedAt: new Date(),
                revokeReason: 'password_reset',
            },
        });

        return { success: true };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string): Promise<{ token: string }> {
        try {
            const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as { userId: string; type: string };

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            // Check session is valid
            const session = await prisma.session.findFirst({
                where: {
                    refreshTokenHash: hashToken(refreshToken),
                    isActive: true,
                    expiresAt: { gte: new Date() },
                },
                include: { user: true },
            });

            if (!session) {
                throw new Error('Session expired');
            }

            // Generate new access token
            const payload: JWTPayload = {
                userId: session.user.id,
                email: session.user.email,
                role: session.user.role,
            };

            const newToken = jwt.sign(payload, env.JWT_SECRET, {
                expiresIn: env.JWT_ACCESS_EXPIRY as any,
            });

            // Update session
            await prisma.session.update({
                where: { id: session.id },
                data: {
                    tokenHash: hashToken(newToken),
                    lastActivityAt: new Date(),
                },
            });

            return { token: newToken };
        } catch {
            throw new Error('Invalid refresh token');
        }
    }

    /**
     * Logout (invalidate session)
     */
    async logout(token: string): Promise<void> {
        await prisma.session.updateMany({
            where: { tokenHash: hashToken(token) },
            data: {
                isActive: false,
                revokedAt: new Date(),
                revokeReason: 'logout',
            },
        });
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                credits: true,
            },
        });
    }
}

export const authService = new AuthService();
