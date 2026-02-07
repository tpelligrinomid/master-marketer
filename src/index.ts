import "dotenv/config";
import express from "express";
import { getEnv } from "./config/env";
import { getCorsMiddleware } from "./config/cors";
import { apiKeyAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";
import routes from "./routes";

const env = getEnv();
const app = express();

app.use(express.json());
app.use(getCorsMiddleware());

// Health check is public
app.use("/api/health", routes);

// All other routes require API key
app.use("/api", apiKeyAuth, routes);

app.use(errorHandler);

app.listen(Number(env.PORT), () => {
  console.log(`Master Marketer API running on port ${env.PORT}`);
});

export default app;
