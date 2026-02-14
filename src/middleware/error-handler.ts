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

  const statusCode = (err as Record<string, unknown>).status ?? (err as Record<string, unknown>).statusCode ?? 500;
  console.error("Unhandled error:", err);
  res.status(statusCode as number).json({ error: err.message || "Internal server error" });
}
