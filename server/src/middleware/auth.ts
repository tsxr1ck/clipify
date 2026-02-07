import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { prisma } from '../config/database.js';
import { hashToken } from '../services/encryption.service.js';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
    token?: string;
}

/**
 * Middleware to authenticate JWT tokens
 */
export async function authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7);

        // Verify token
        const decoded = jwt.verify(token, env.JWT_SECRET) as {
            userId: string;
            email: string;
            role: string;
        };

        // Check session is still valid
        const session = await prisma.session.findFirst({
            where: {
                tokenHash: hashToken(token),
                isActive: true,
                expiresAt: { gte: new Date() },
            },
        });

        if (!session) {
            res.status(401).json({ error: 'Session expired' });
            return;
        }

        // Update last activity
        await prisma.session.update({
            where: { id: session.id },
            data: { lastActivityAt: new Date() },
        });

        req.user = decoded;
        req.token = token;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expired' });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        res.status(500).json({ error: 'Authentication failed' });
    }
}

/**
 * Middleware to authorize by role
 */
export function authorize(...allowedRoles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    };
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, env.JWT_SECRET) as {
            userId: string;
            email: string;
            role: string;
        };

        req.user = decoded;
        req.token = token;
        next();
    } catch {
        // Don't fail, just continue without user
        next();
    }
}
