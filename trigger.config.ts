import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_gnaoyrrpmfvdbrxsyhzu",
  runtime: "node",
  logLevel: "log",
  maxDuration: 900, // 15 minutes for research pipeline (intelligence gathering + sequential Claude calls)
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 2,
    },
  },
  dirs: ["./trigger"],
});
