import "dotenv/config";
import { ApifyClient } from "apify-client";

async function main() {
  const client = new ApifyClient({ token: process.env.APIFY_API_KEY });
  const url = "https://www.linkedin.com/company/doclib";

  console.log("Running Apify actor 3rgDeYgLhr6XrVnjs for:", url);
  const run = await client.actor("3rgDeYgLhr6XrVnjs").call(
    { urls: [url] },
    { timeout: 120 }
  );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  const item = items[0] as Record<string, unknown> | undefined;

  if (!item) {
    console.log("No items returned!");
    return;
  }

  console.log("\n=== ALL KEYS ===");
  console.log(Object.keys(item));

  console.log("\n=== FOLLOWER/EMPLOYEE RELATED FIELDS ===");
  for (const [k, v] of Object.entries(item)) {
    const kl = k.toLowerCase();
    if (kl.includes("follow") || kl.includes("staff") || kl.includes("employee") || kl.includes("member")) {
      console.log(`  ${k}: ${JSON.stringify(v)}`);
    }
  }

  console.log("\n=== FULL RESPONSE (first 5000 chars) ===");
  console.log(JSON.stringify(item, null, 2).substring(0, 5000));
}

main().catch(console.error);
