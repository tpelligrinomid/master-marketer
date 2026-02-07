import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { CampaignInputSchema, CampaignInput } from "./types/campaign-input";
import { SYSTEM_PROMPT } from "./prompts/system";
import { buildLinkedInPrompt } from "./prompts/linkedin";
import { buildDisplayPrompt } from "./prompts/display";

// --- Configuration ---

const MODEL = "claude-opus-4-20250514";
const MAX_TOKENS = 4096;

// --- Types ---

// The output is loosely typed since LinkedIn and display have different structures.
// LinkedIn has: post_text, image_copy, headline, visual_direction
// Display has: image_copy, visual_direction
// Both have: target_role, angle, rationale
type AdVariation = Record<string, unknown>;

interface GenerationResult {
  campaign_name: string;
  generated_at: string;
  model: string;
  total_variations: number;
  ads: {
    platform: string;
    ad_type: string;
    variations: AdVariation[];
  }[];
}

// --- Core Logic ---

function loadLibrary() {
  const libPath = path.resolve(__dirname, "../data/ad-reference-library.json");
  const raw = fs.readFileSync(libPath, "utf-8");
  return JSON.parse(raw);
}

function loadVisualLibrary() {
  const libPath = path.resolve(__dirname, "../data/visual-styles-library.json");
  const raw = fs.readFileSync(libPath, "utf-8");
  return JSON.parse(raw);
}

function loadCampaignInput(inputPath: string): CampaignInput {
  const raw = fs.readFileSync(inputPath, "utf-8");
  const parsed = JSON.parse(raw);
  return CampaignInputSchema.parse(parsed);
}

function extractJson(text: string): unknown {
  // Try to extract JSON from Claude's response — handle markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim());
  }
  // Try direct parse
  return JSON.parse(text.trim());
}

function validateCharLimits(variations: AdVariation[], platform: string): AdVariation[] {
  return variations.map(v => {
    const warnings: string[] = [];

    if (platform === "linkedin") {
      // Check headline (below image, max 70)
      const headline = v.headline as string | undefined;
      if (headline && headline.length > 70) {
        warnings.push(`headline ${headline.length}/70`);
      }
      // Check post_text (above image, max 600)
      const postText = v.post_text as string | undefined;
      if (postText && postText.length > 600) {
        warnings.push(`post_text ${postText.length}/600`);
      }
    }

    if (platform === "display") {
      const imageCopy = v.image_copy as Record<string, unknown> | undefined;
      if (imageCopy) {
        const primary = imageCopy.primary_text as string | undefined;
        if (primary && primary.length > 30) {
          warnings.push(`primary_text ${primary.length}/30`);
        }
        const supporting = imageCopy.supporting_text as string | undefined;
        if (supporting && supporting.length > 90) {
          warnings.push(`supporting_text ${supporting.length}/90`);
        }
        const cta = imageCopy.cta_text as string | undefined;
        if (cta && cta.length > 15) {
          warnings.push(`cta_text ${cta.length}/15`);
        }
      }
    }

    if (warnings.length) {
      v.char_limit_warnings = warnings;
      const rationale = v.rationale as string || "";
      v.rationale = rationale + ` [WARNING: Character limits exceeded: ${warnings.join(", ")}]`;
    }

    return v;
  });
}

async function generateAdsForType(
  client: Anthropic,
  input: CampaignInput,
  platform: string,
  adType: string,
  library: ReturnType<typeof loadLibrary>,
  visualLibrary: ReturnType<typeof loadVisualLibrary>,
): Promise<AdVariation[]> {
  const variationCount = input.platform.variations_per_type;

  const prompt = platform === "linkedin"
    ? buildLinkedInPrompt(input, adType, variationCount, library, visualLibrary)
    : buildDisplayPrompt(input, adType, variationCount, library, visualLibrary);

  console.log(`  Generating ${platform} / ${adType} (${variationCount} variations)...`);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find(c => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const parsed = extractJson(textContent.text) as AdVariation[];
  return validateCharLimits(parsed, platform);
}

async function generate(inputPath: string, outputPath?: string): Promise<GenerationResult> {
  // Validate API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is required");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const library = loadLibrary();
  const visualLibrary = loadVisualLibrary();
  const input = loadCampaignInput(inputPath);

  console.log(`\nCampaign: ${input.campaign_name}`);
  console.log(`Platforms: ${input.platform.platforms.join(", ")}`);
  console.log(`Ad Types: ${input.platform.ad_types.join(", ")}`);
  console.log(`Variations per type: ${input.platform.variations_per_type}`);
  console.log(`Target Audience: ${input.audience.job_titles.join(", ")}`);
  console.log("");

  const allAds: GenerationResult["ads"] = [];

  // Generate for each platform × ad type combination
  for (const platform of input.platform.platforms) {
    for (const adType of input.platform.ad_types) {
      try {
        const variations = await generateAdsForType(
          client,
          input,
          platform,
          adType,
          library,
          visualLibrary,
        );
        allAds.push({ platform, ad_type: adType, variations });
        console.log(`  ✓ ${platform} / ${adType}: ${variations.length} variations`);
      } catch (err) {
        console.error(`  ✗ ${platform} / ${adType}: ${err}`);
        allAds.push({ platform, ad_type: adType, variations: [] });
      }
    }
  }

  const result: GenerationResult = {
    campaign_name: input.campaign_name,
    generated_at: new Date().toISOString(),
    model: MODEL,
    total_variations: allAds.reduce((sum, a) => sum + a.variations.length, 0),
    ads: allAds,
  };

  // Write output
  const outPath = outputPath || inputPath.replace(".json", "-output.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nGenerated ${result.total_variations} total ad variations`);
  console.log(`Output written to: ${outPath}`);

  return result;
}

// --- CLI Entry Point ---

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile) {
  console.log("Usage: npx tsx src/generate.ts <campaign-input.json> [output.json]");
  console.log("Example: npx tsx src/generate.ts examples/sample-campaign.json");
  process.exit(1);
}

generate(path.resolve(inputFile), outputFile ? path.resolve(outputFile) : undefined)
  .catch(err => {
    console.error("Generation failed:", err);
    process.exit(1);
  });
