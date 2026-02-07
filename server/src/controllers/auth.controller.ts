import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { authService } from '../services/auth.service.js';

// Validation schemas
export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
    token: z.string().min(1, 'Token is required'),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const authController = {
    /**
     * POST /auth/register
     */
    async register(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;
            const result = await authService.register(email, password);
            res.status(201).json({
                message: 'Registration successful. Please verify your email.',
                ...result,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Registration failed';
            res.status(400).json({ error: message });
        }
    },

    /**
     * POST /auth/login
     */
    async login(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;
            const ipAddress = req.ip || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const result = await authService.login(email, password, ipAddress, userAgent);
            res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed';
            res.status(401).json({ error: message });
        }
    },

    /**
     * POST /auth/verify-email
     */
    async verifyEmail(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { token } = req.body;
            const result = await authService.verifyEmail(token);
            res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Verification failed';
            res.status(400).json({ error: message });
        }
    },

    /**
     * POST /auth/forgot-password
     */
    async forgotPassword(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { email } = req.body;
            const result = await authService.requestPasswordReset(email);
            res.json({ message: 'If the email exists, a reset link has been sent.', ...result });
        } catch (error) {
            // Always return success to prevent email enumeration
            res.json({ message: 'If the email exists, a reset link has been sent.', success: true });
        }
    },

    /**
     * POST /auth/reset-password
     */
    async resetPassword(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { token, password } = req.body;
            const result = await authService.resetPassword(token, password);
            res.json({ message: 'Password reset successful.', ...result });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Reset failed';
            res.status(400).json({ error: message });
        }
    },

    /**
     * POST /auth/refresh
     */
    async refresh(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;
            const result = await authService.refreshToken(refreshToken);
            res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Refresh failed';
            res.status(401).json({ error: message });
        }
    },

    /**
     * POST /auth/logout
     */
    async logout(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (req.token) {
                await authService.logout(req.token);
            }
            res.json({ message: 'Logged out successfully' });
        } catch {
            res.json({ message: 'Logged out successfully' });
        }
    },

    /**
     * GET /auth/me
     */
    async me(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            const user = await authService.getUserById(req.user.userId);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({
                id: user.id,
                email: user.email,
                role: user.role,
                emailVerified: user.emailVerified,
                profile: user.profile,
                credits: user.credits ? {
                    balance: user.credits.balanceMxn,
                    currency: user.credits.currency,
                } : null,
                createdAt: user.createdAt,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get user';
            res.status(500).json({ error: message });
        }
    },
};
