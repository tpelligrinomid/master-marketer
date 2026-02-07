import { Request, Response, NextFunction } from "express";
import { getEnv } from "../config/env";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"];
  const env = getEnv();

  if (!apiKey || apiKey !== env.API_KEY) {
    res.status(401).json({ error: "Invalid or missing API key" });
    return;
  }

  next();
}
