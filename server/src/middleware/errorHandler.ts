import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import multer from "multer";
import type { ApiErrorBody } from "@asa/shared";
import { AppError } from "../utils/AppError";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", `No route for ${req.method} ${req.originalUrl}`));
};

/** Converts any thrown error into `{ error: { code, message, details? } }`. */
export function createErrorHandler(options: { exposeInternals: boolean }): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    const { status, body } = toResponse(err, options.exposeInternals);
    if (status >= 500) console.error(err);
    res.status(status).json(body);
  };
}

function toResponse(err: unknown, exposeInternals: boolean): { status: number; body: ApiErrorBody } {
  const make = (status: number, code: string, message: string, details?: unknown) => ({
    status,
    body: { error: details === undefined ? { code, message } : { code, message, details } },
  });

  if (err instanceof AppError) return make(err.status, err.code, err.message, err.details);

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return make(400, "VALIDATION_ERROR", "The request is invalid", details);
  }

  // Upload errors (middleware/upload.ts).
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return make(413, "FILE_TOO_LARGE", "The file is too large");
    return make(400, "INVALID_UPLOAD", err.field ? `${err.message} (${err.field})` : err.message);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return make(409, "CONFLICT", "That record already exists");
    if (err.code === "P2025") return make(404, "NOT_FOUND", "Not found");
  }

  // body-parser errors carry an HTTP status and a `type`.
  if (isHttpError(err)) {
    if (err.type === "entity.parse.failed") return make(400, "INVALID_JSON", "Request body is not valid JSON");
    if (err.type === "entity.too.large") return make(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
    if (err.status < 500) return make(err.status, "BAD_REQUEST", err.message);
  }

  return make(
    500,
    "INTERNAL_ERROR",
    "Something went wrong on our side. Please try again.",
    exposeInternals && err instanceof Error ? { message: err.message, stack: err.stack } : undefined,
  );
}

function isHttpError(err: unknown): err is { status: number; type?: string; message: string } {
  return typeof err === "object" && err !== null && typeof (err as { status?: unknown }).status === "number";
}
