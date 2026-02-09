import Anthropic from "@anthropic-ai/sdk";
import {
  LinkedInAd,
  GoogleAd,
  AdCreativeAnalysis,
} from "../types/research-intelligence";

const VISION_MODEL = "claude-sonnet-4-20250514";
const MAX_IMAGES = 10; // Limit to control cost and context window
const IMAGE_DOWNLOAD_TIMEOUT = 10000; // 10s per image

/**
 * Download an image and return as base64 with media type.
 */
async function downloadImage(
  url: string
): Promise<{ data: string; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp" } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_DOWNLOAD_TIMEOUT);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    if (contentType.includes("png")) mediaType = "image/png";
    else if (contentType.includes("gif")) mediaType = "image/gif";
    else if (contentType.includes("webp")) mediaType = "image/webp";
    else mediaType = "image/jpeg";

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      data: buffer.toString("base64"),
      media_type: mediaType,
    };
  } catch {
    return null;
  }
}

/**
 * Analyze ad creatives using Claude Sonnet vision.
 * Downloads images from ad library scrapes and sends to Claude for competitive analysis.
 */
export async function analyzeAdCreatives(
  companyName: string,
  linkedinAds: LinkedInAd[],
  googleAds: GoogleAd[],
  anthropicApiKey: string
): Promise<AdCreativeAnalysis> {
  // Collect image URLs from both sources
  const imageUrls: string[] = [];
  const adMetadata: string[] = [];

  for (const ad of linkedinAds) {
    if (ad.image_url) {
      imageUrls.push(ad.image_url);
      adMetadata.push(
        `LinkedIn Ad: ${ad.headline || "N/A"} | CTA: ${ad.cta || "N/A"} | Body: ${ad.body?.slice(0, 100) || "N/A"}`
      );
    }
  }

  for (const ad of googleAds) {
    if (ad.image_url) {
      imageUrls.push(ad.image_url);
      adMetadata.push(
        `Google Ad: ${ad.headline || "N/A"} | Description: ${ad.description?.slice(0, 100) || "N/A"} | Format: ${ad.format || "N/A"}`
      );
    }
  }

  // If no images, return analysis based on text metadata only
  if (imageUrls.length === 0) {
    return analyzeTextOnly(companyName, linkedinAds, googleAds, anthropicApiKey);
  }

  // Download images (limit to MAX_IMAGES)
  const toDownload = imageUrls.slice(0, MAX_IMAGES);
  const downloadResults = await Promise.allSettled(
    toDownload.map((url) => downloadImage(url))
  );

  const images: { data: string; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp" }[] = [];
  for (const result of downloadResults) {
    if (result.status === "fulfilled" && result.value) {
      images.push(result.value);
    }
  }

  if (images.length === 0) {
    return analyzeTextOnly(companyName, linkedinAds, googleAds, anthropicApiKey);
  }

  // Build Claude vision request
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const content: Anthropic.Messages.ContentBlockParam[] = [];

  // Add images
  for (const img of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.media_type,
        data: img.data,
      },
    });
  }

  // Add text context
  content.push({
    type: "text",
    text: `Analyze these ${images.length} ad creatives from ${companyName}.

Additional ad metadata:
${adMetadata.slice(0, MAX_IMAGES).join("\n")}

Provide your analysis as JSON with this structure:
{
  "summary": "2-3 sentence overview of their ad strategy",
  "themes": ["theme1", "theme2", ...],
  "messaging_patterns": ["pattern1", "pattern2", ...],
  "visual_patterns": ["pattern1", "pattern2", ...],
  "cta_patterns": ["cta1", "cta2", ...],
  "targeting_observations": ["observation1", "observation2", ...]
}

Return ONLY the JSON object.`,
  });

  const response = await client.messages.create({
    model: VISION_MODEL,
    max_tokens: 2048,
    system:
      "You are an expert advertising analyst. Analyze ad creatives and provide structured competitive intelligence. Output valid JSON only.",
    messages: [{ role: "user", content }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude vision analysis");
  }

  try {
    const codeBlockMatch = textContent.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : textContent.text.trim();
    return JSON.parse(jsonStr) as AdCreativeAnalysis;
  } catch {
    return {
      summary: textContent.text.slice(0, 500),
      themes: [],
      messaging_patterns: [],
      visual_patterns: [],
      cta_patterns: [],
      targeting_observations: [],
    };
  }
}

/**
 * Fallback: analyze ad strategy from text metadata only (no images available).
 */
async function analyzeTextOnly(
  companyName: string,
  linkedinAds: LinkedInAd[],
  googleAds: GoogleAd[],
  anthropicApiKey: string
): Promise<AdCreativeAnalysis> {
  const adTexts: string[] = [];

  for (const ad of linkedinAds.slice(0, 20)) {
    adTexts.push(
      `[LinkedIn] Headline: ${ad.headline || "N/A"} | Body: ${ad.body || "N/A"} | CTA: ${ad.cta || "N/A"}`
    );
  }
  for (const ad of googleAds.slice(0, 20)) {
    adTexts.push(
      `[Google] Headline: ${ad.headline || "N/A"} | Description: ${ad.description || "N/A"} | Format: ${ad.format || "N/A"}`
    );
  }

  if (adTexts.length === 0) {
    return {
      summary: `No ad data available for ${companyName}.`,
      themes: [],
      messaging_patterns: [],
      visual_patterns: [],
      cta_patterns: [],
      targeting_observations: [],
    };
  }

  const client = new Anthropic({ apiKey: anthropicApiKey });

  const response = await client.messages.create({
    model: VISION_MODEL,
    max_tokens: 2048,
    system:
      "You are an expert advertising analyst. Analyze ad copy and provide structured competitive intelligence. Output valid JSON only.",
    messages: [
      {
        role: "user",
        content: `Analyze these ads from ${companyName}:\n\n${adTexts.join("\n")}\n\nProvide your analysis as JSON with this structure:
{
  "summary": "2-3 sentence overview of their ad strategy",
  "themes": ["theme1", "theme2", ...],
  "messaging_patterns": ["pattern1", "pattern2", ...],
  "visual_patterns": ["pattern1", "pattern2", ...],
  "cta_patterns": ["cta1", "cta2", ...],
  "targeting_observations": ["observation1", "observation2", ...]
}

Return ONLY the JSON object.`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude ad analysis");
  }

  try {
    const codeBlockMatch = textContent.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : textContent.text.trim();
    return JSON.parse(jsonStr) as AdCreativeAnalysis;
  } catch {
    return {
      summary: textContent.text.slice(0, 500),
      themes: [],
      messaging_patterns: [],
      visual_patterns: [],
      cta_patterns: [],
      targeting_observations: [],
    };
  }
}
