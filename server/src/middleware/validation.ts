import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';

/**
 * Create a validation middleware for request body
 */
export function validateBody<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
}

/**
 * Create a validation middleware for query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.query = schema.parse(req.query) as typeof req.query;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    error: 'Invalid query parameters',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
}

/**
 * Create a validation middleware for URL parameters
 */
export function validateParams<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.params = schema.parse(req.params) as typeof req.params;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    error: 'Invalid URL parameters',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
}
