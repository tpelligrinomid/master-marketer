import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

interface GenerationOutput {
  campaign_name: string;
  generated_at: string;
  model: string;
  total_variations: number;
  ads: {
    platform: string;
    ad_type: string;
    variations: Record<string, unknown>[];
  }[];
}

function formatAdType(adType: string): string {
  return adType
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatPlatform(platform: string): string {
  const names: Record<string, string> = {
    linkedin: "LinkedIn Sponsored Content",
    display: "Display / Banner Ads",
  };
  return names[platform] || platform;
}

function renderLinkedInAd(v: Record<string, unknown>, index: number): string {
  const imageCopy = v.image_copy as Record<string, string> | undefined;
  const visualDir = v.visual_direction as Record<string, string> | undefined;

  const lines: string[] = [];
  lines.push(`### Variation ${index + 1}: ${v.angle || ""}  `);
  lines.push(`**Target Role:** ${v.target_role || "—"}`);
  lines.push("");

  // Post text (above the image)
  if (v.post_text) {
    lines.push(`#### Post Text (above image)`);
    lines.push(`${v.post_text}`);
    lines.push("");
    lines.push(`*${v.post_text_char_count || (v.post_text as string).length} characters*`);
    lines.push("");
  }

  // Image copy
  if (imageCopy) {
    lines.push(`#### On the Image`);
    lines.push(`| Element | Copy |`);
    lines.push(`|---------|------|`);
    lines.push(`| **Primary Text** | ${imageCopy.primary_text || "—"} |`);
    if (imageCopy.supporting_text) {
      lines.push(`| **Supporting Text** | ${imageCopy.supporting_text} |`);
    }
    lines.push(`| **CTA** | ${imageCopy.cta_text || "—"} |`);
    lines.push("");
  }

  // Headline (below image)
  if (v.headline) {
    lines.push(`#### Headline (below image)`);
    lines.push(`**${v.headline}** *(${v.headline_char_count || (v.headline as string).length} chars)*`);
    lines.push("");
  }

  // Visual direction
  if (visualDir) {
    lines.push(`#### Visual Direction for Designer`);
    lines.push(`**Concept:** ${visualDir.concept || "—"}`);
    lines.push("");
    lines.push(`**Style:** ${visualDir.style_notes || "—"}`);
    lines.push("");
    lines.push(`**Reference:** ${visualDir.reference_description || "—"}`);
    lines.push("");
  }

  // Rationale
  if (v.rationale) {
    lines.push(`#### Strategic Rationale`);
    lines.push(`*${v.rationale}*`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

function renderDisplayAd(v: Record<string, unknown>, index: number): string {
  const imageCopy = v.image_copy as Record<string, unknown> | undefined;
  const visualDir = v.visual_direction as Record<string, unknown> | undefined;

  const lines: string[] = [];
  lines.push(`### Variation ${index + 1}: ${v.angle || ""}  `);
  lines.push(`**Target Role:** ${v.target_role || "—"}`);
  lines.push("");

  // Image copy (this IS the ad)
  if (imageCopy) {
    lines.push(`#### Ad Copy (rendered on image)`);
    lines.push(`| Element | Copy | Chars |`);
    lines.push(`|---------|------|-------|`);
    lines.push(`| **Primary Text** | ${imageCopy.primary_text || "—"} | ${imageCopy.primary_text_char_count || "—"} |`);
    if (imageCopy.supporting_text) {
      lines.push(`| **Supporting Text** | ${imageCopy.supporting_text} | ${imageCopy.supporting_text_char_count || "—"} |`);
    }
    lines.push(`| **CTA Button** | ${imageCopy.cta_text || "—"} | ${imageCopy.cta_text_char_count || "—"} |`);
    lines.push("");
  }

  // Visual direction
  if (visualDir) {
    lines.push(`#### Visual Direction for Designer`);
    lines.push(`**Concept:** ${visualDir.concept || "—"}`);
    lines.push("");
    lines.push(`**Style:** ${visualDir.style_notes || "—"}`);
    lines.push("");
    lines.push(`**Reference:** ${visualDir.reference_description || "—"}`);
    lines.push("");
    const sizes = visualDir.sizes_to_design as string[] | undefined;
    if (sizes?.length) {
      lines.push(`**Sizes to Design:** ${sizes.join(", ")}`);
      lines.push("");
    }
  }

  // Rationale
  if (v.rationale) {
    lines.push(`#### Strategic Rationale`);
    lines.push(`*${v.rationale}*`);
    lines.push("");
  }

  // Warnings
  const warnings = v.char_limit_warnings as string[] | undefined;
  if (warnings?.length) {
    lines.push(`> **⚠ Character Limit Warning:** ${warnings.join(", ")}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

function exportMarkdown(inputPath: string, outputPath?: string): void {
  const raw = fs.readFileSync(inputPath, "utf-8");
  const data: GenerationOutput = JSON.parse(raw);

  const lines: string[] = [];

  // Header
  lines.push(`# ${data.campaign_name}`);
  lines.push("");
  lines.push(`**Generated:** ${new Date(data.generated_at).toLocaleString()}  `);
  lines.push(`**Model:** ${data.model}  `);
  lines.push(`**Total Variations:** ${data.total_variations}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Table of contents
  lines.push("## Table of Contents");
  lines.push("");
  const platformGroups: Record<string, typeof data.ads> = {};
  for (const group of data.ads) {
    if (!platformGroups[group.platform]) platformGroups[group.platform] = [];
    platformGroups[group.platform].push(group);
  }

  for (const [platform, groups] of Object.entries(platformGroups)) {
    lines.push(`### ${formatPlatform(platform)}`);
    for (const group of groups) {
      const anchor = `${group.platform}-${group.ad_type}`.replace(/_/g, "-");
      lines.push(`- [${formatAdType(group.ad_type)} Ads](#${anchor}) (${group.variations.length} variations)`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // Ads grouped by platform
  for (const [platform, groups] of Object.entries(platformGroups)) {
    lines.push(`# ${formatPlatform(platform)}`);
    lines.push("");

    for (const group of groups) {
      const anchor = `${group.platform}-${group.ad_type}`.replace(/_/g, "-");
      lines.push(`<a id="${anchor}"></a>`);
      lines.push("");
      lines.push(`## ${formatAdType(group.ad_type)} Ads`);
      lines.push("");

      for (let i = 0; i < group.variations.length; i++) {
        const v = group.variations[i];
        if (platform === "linkedin") {
          lines.push(renderLinkedInAd(v, i));
        } else {
          lines.push(renderDisplayAd(v, i));
        }
      }
    }
  }

  const outPath = outputPath || inputPath.replace("-output.json", "-creative-brief.md");
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(`Markdown brief written to: ${outPath}`);
}

// --- CLI ---
const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile) {
  console.log("Usage: npx tsx src/export-markdown.ts <output.json> [brief.md]");
  process.exit(1);
}

exportMarkdown(path.resolve(inputFile), outputFile ? path.resolve(outputFile) : undefined);
