import { Request, Response, NextFunction } from 'express';

/**
 * Standardized 404 route handler for invalid API endpoints.
 * Never echoes user input (e.g. req.originalUrl or req.path) verbatim to prevent
 * Reflected XSS (CWE-79 / QID 150084) vulnerabilities.
 */
export const notFound = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({
    success: false,
    error: 'Resource or endpoint not found',
    code: 'NOT_FOUND',
  });
};
