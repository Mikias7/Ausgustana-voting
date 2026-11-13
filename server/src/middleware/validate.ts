import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates and replaces req.body / req.query / req.params with the parsed
 * (typed, defaulted, stripped) values. A ZodError is turned into a
 * 400 VALIDATION_ERROR by the error handler.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) {
      // Express 5 exposes req.query as a getter, so redefine it.
      Object.defineProperty(req, "query", {
        value: schemas.query.parse(req.query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    next();
  };
}
