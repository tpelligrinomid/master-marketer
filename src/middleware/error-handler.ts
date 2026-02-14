import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const errAny = err as unknown as Record<string, unknown>;
  const statusCode = errAny.status ?? errAny.statusCode ?? 500;
  console.error("Unhandled error:", err);
  res.status(statusCode as number).json({ error: err.message || "Internal server error" });
}
