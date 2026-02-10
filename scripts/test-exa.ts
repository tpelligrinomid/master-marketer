/**
 * Quick isolated test for Exa.ai integration.
 *
 * Usage:
 *   EXA_API_KEY=your-key-here npx tsx scripts/test-exa.ts
 *
 * Or add EXA_API_KEY to your .env and run:
 *   npx tsx scripts/test-exa.ts
 */
import "dotenv/config";
import Exa from "exa-js";

const apiKey = process.env.EXA_API_KEY;

if (!apiKey) {
  console.error("ERROR: EXA_API_KEY not set. Pass it as an env var or add to .env");
  process.exit(1);
}

console.log(`API key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)} (${apiKey.length} chars)`);

const exa = new Exa(apiKey);

async function testQuery(query: string) {
  console.log(`\n--- Query: "${query}" ---`);
  try {
    const response = await exa.searchAndContents(query, {
      type: "auto",
      numResults: 3,
      text: {
        maxCharacters: 500,
      },
    });

    console.log(`Results: ${response.results.length}`);
    for (const r of response.results) {
      console.log(`  - ${r.title}`);
      console.log(`    URL: ${r.url}`);
      console.log(`    Text: ${r.text?.slice(0, 150)}...`);
    }
  } catch (err: any) {
    console.error(`FAILED:`, err.message || err);
    if (err.response) {
      console.error(`Status:`, err.response.status);
      console.error(`Body:`, JSON.stringify(err.response.data, null, 2));
    }
    // Print full error for debugging
    console.error(`Full error:`, JSON.stringify(err, null, 2));
  }
}

async function main() {
  // Test 1: Simple query (should work for any valid key)
  await testQuery("biotech market size 2025");

  // Test 2: Query matching the Bionomous report
  await testQuery('"Bionomous" Swiss biotech company');

  // Test 3: Competitor query
  await testQuery('"Union Biometrica" biotech');

  console.log("\n--- Done ---");
}

main().catch(console.error);
