import cors from "cors";
import { getEnv } from "./env";

export function getCorsMiddleware() {
  const env = getEnv();
  return cors({
    origin: env.NODE_ENV === "development"
      ? true
      : env.FRONTEND_URL,
    credentials: true,
  });
}
