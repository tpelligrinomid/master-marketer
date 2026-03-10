import "dotenv/config";

const apiKey = process.env.KEYWORDS_EVERYWHERE_API_KEY;
if (!apiKey) {
  console.error("KEYWORDS_EVERYWHERE_API_KEY not set");
  process.exit(1);
}
console.log("API key:", apiKey.slice(0, 8) + "...");

const domains = ["wsb.com", "bigspeak.com", "harrywalker.com", "allamericanspeakers.com", "caa.com"];

async function testDomain(domain: string) {
  const url = "https://api.keywordseverywhere.com/v1/get_domain_traffic";
  console.log(`\n--- Testing: ${domain} ---`);

  // Try JSON body
  console.log("Attempt 1: JSON body");
  const r1 = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domain, country: "us" }),
  });
  console.log("  Status:", r1.status);
  console.log("  Body:", (await r1.text()).slice(0, 300));

  // Try form-encoded
  console.log("Attempt 2: Form-encoded body");
  const params = new URLSearchParams();
  params.append("domain", domain);
  params.append("country", "us");
  const r2 = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: params,
  });
  console.log("  Status:", r2.status);
  console.log("  Body:", (await r2.text()).slice(0, 300));
}

async function main() {
  // Test with num=5 to see structure and check for totals
  console.log("\n--- get_domain_keywords for wsb.com (num=5) ---");
  const r = await fetch("https://api.keywordseverywhere.com/v1/get_domain_keywords", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domain: "wsb.com", country: "us", currency: "USD", num: 5 }),
  });
  console.log("Status:", r.status);
  const json = await r.json() as Record<string, unknown>;
  // Show all top-level keys
  console.log("Top-level keys:", Object.keys(json));
  console.log("Full response:", JSON.stringify(json, null, 2).slice(0, 2000));
}

main().catch(console.error);
