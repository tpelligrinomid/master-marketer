import cors from "cors";

export function getCorsMiddleware() {
  // Master Marketer is a backend-to-backend service.
  // CORS is permissive since auth is handled via API key.
  return cors();
}
