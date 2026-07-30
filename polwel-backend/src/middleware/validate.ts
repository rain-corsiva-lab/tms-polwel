import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Express middleware to validate request body against a Zod schema.
 * Rejects invalid, non-object, missing, or malformed request payloads with 400 Bad Request
 * instead of allowing unexpected payload shapes to cause runtime 500 crashes.
 */
export const validateBody = (schema: ZodSchema): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (req.body === null || req.body === undefined || typeof req.body !== 'object' || Array.isArray(req.body)) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body format. Expected a JSON object.',
          code: 'BAD_REQUEST',
        });
        return;
      }

      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((e) => {
          const pathStr = e.path.join('.');
          return pathStr ? `${pathStr}: ${e.message}` : e.message;
        }).join('; ');

        res.status(400).json({
          success: false,
          error: `Validation error: ${issues}`,
          code: 'VALIDATION_ERROR',
          details: error.errors,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Invalid or malformed request payload',
        code: 'BAD_REQUEST',
      });
    }
  };
};

/**
 * Express middleware to validate request query parameters against a Zod schema.
 */
export const validateQuery = (schema: ZodSchema): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query || {}) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        res.status(400).json({
          success: false,
          error: `Invalid query parameters: ${issues}`,
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        code: 'BAD_REQUEST',
      });
    }
  };
};
