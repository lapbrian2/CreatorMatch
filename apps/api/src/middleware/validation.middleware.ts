import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError, ErrorCodes } from '../utils/response';

type RequestLocation = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, location: RequestLocation = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req[location] = schema.parse(req[location]);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        error.errors.forEach((e) => {
          const path = e.path.join('.');
          if (!details[path]) details[path] = [];
          details[path].push(e.message);
        });
        return next(new AppError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400, details));
      }
      return next(error);
    }
  };
}

export function validateBody(schema: ZodSchema) {
  return validate(schema, 'body');
}

export function validateQuery(schema: ZodSchema) {
  return validate(schema, 'query');
}

export function validateParams(schema: ZodSchema) {
  return validate(schema, 'params');
}
