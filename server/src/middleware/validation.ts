import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';

// Extended request type that stores validated data
declare global {
    namespace Express {
        interface Request {
            validatedQuery?: unknown;
            validatedParams?: unknown;
        }
    }
}

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
 * Note: req.query is read-only in Bun, so we validate and store in req.validatedQuery
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            // Just validate, don't try to reassign req.query (it's read-only in Bun)
            const validated = schema.parse(req.query);
            // Store validated data for access in controllers if needed
            req.validatedQuery = validated;
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
 * Note: req.params may also be read-only in some environments
 */
export function validateParams<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            // Just validate, don't try to reassign req.params
            const validated = schema.parse(req.params);
            req.validatedParams = validated;
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
