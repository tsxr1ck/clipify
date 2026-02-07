import type { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
}

/**
 * Global error handler middleware
 */
export function errorHandler(
    err: ApiError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    console.error('Error:', err);

    // Default to 500 if no status code
    const statusCode = err.statusCode || 500;

    // Don't expose internal errors in production
    const message = statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        error: message,
        ...(err.code && { code: err.code }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

/**
 * Not found handler
 */
export function notFoundHandler(_req: Request, res: Response): void {
    res.status(404).json({ error: 'Not found' });
}

/**
 * Create an API error with status code
 */
export function createError(message: string, statusCode: number = 500, code?: string): ApiError {
    const error: ApiError = new Error(message);
    error.statusCode = statusCode;
    if (code) error.code = code;
    return error;
}
