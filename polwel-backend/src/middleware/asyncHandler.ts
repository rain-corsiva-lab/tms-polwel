import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async handler wrapper to catch unhandled promise rejections in Express controllers
 * and forward them to the global error handling middleware cleanly without crashing.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
