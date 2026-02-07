import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { CampaignInputSchema } from "./types/campaign-input";
import { INTAKE_SYSTEM_PROMPT, buildIntakePrompt } from "./prompts/intake";

// --- Configuration ---

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8192;

// --- File Reading ---

const SUPPORTED_EXTENSIONS = [".txt", ".md", ".pdf", ".docx", ".doc", ".json"];

async function readFileContent(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".pdf": {
      const buffer = fs.readFileSync(filePath);
      const pdf = await pdfParse(buffer);
      return pdf.text;
    }

    case ".docx":
    case ".doc": {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    case ".txt":
    case ".md":
    case ".json":
    default: {
      return fs.readFileSync(filePath, "utf-8");
    }
  }
}

async function loadSourceDocuments(
  inputPaths: string[],
): Promise<{ filename: string; content: string }[]> {
  const docs: { filename: string; content: string }[] = [];

  for (const inputPath of inputPaths) {
    const resolved = path.resolve(inputPath);
    const stat = fs.statSync(resolved);

    if (stat.isDirectory()) {
      // Read all supported files in the directory
      const files = fs.readdirSync(resolved)
        .filter(f => SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase()))
        .sort();

      for (const file of files) {
        const filePath = path.join(resolved, file);
        console.log(`  Reading: ${file}`);
        const content = await readFileContent(filePath);
        docs.push({ filename: file, content });
      }
    } else {
      console.log(`  Reading: ${path.basename(resolved)}`);
      const content = await readFileContent(resolved);
      docs.push({ filename: path.basename(resolved), content });
    }
  }

  return docs;
}

// --- Extraction ---

function extractJson(text: string): unknown {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim());
  }
  return JSON.parse(text.trim());
}

// --- Main ---

async function intake(
  inputPaths: string[],
  outputPath: string,
  guidance?: string,
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is required");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // Load source documents
  console.log("\nLoading source documents...");
  const docs = await loadSourceDocuments(inputPaths);

  if (docs.length === 0) {
    console.error("Error: No readable documents found in the provided paths.");
    process.exit(1);
  }

  console.log(`\nLoaded ${docs.length} document(s):`);
  docs.forEach(d => {
    console.log(`  - ${d.filename} (${d.content.length} chars)`);
  });

  // Truncate very large docs to fit in context window
  const MAX_CHARS_PER_DOC = 50000;
  const truncatedDocs = docs.map(d => ({
    filename: d.filename,
    content: d.content.length > MAX_CHARS_PER_DOC
      ? d.content.slice(0, MAX_CHARS_PER_DOC) + `\n\n[... truncated at ${MAX_CHARS_PER_DOC} characters]`
      : d.content,
  }));

  // Build prompt and call Claude
  const prompt = buildIntakePrompt(truncatedDocs, guidance);

  console.log("\nAnalyzing documents and extracting campaign structure...");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: INTAKE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find(c => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const result = extractJson(textContent.text) as {
    campaign_input: unknown;
    review_notes: {
      confidence: string;
      extracted_from: string[];
      gaps: string[];
      assumptions: string[];
      suggestions: string[];
    };
  };

  // Validate the campaign input against the schema
  const validation = CampaignInputSchema.safeParse(result.campaign_input);

  if (!validation.success) {
    console.error("\nWarning: Extracted campaign input has validation issues:");
    validation.error.errors.forEach(e => {
      console.error(`  - ${e.path.join(".")}: ${e.message}`);
    });
    console.log("\nWriting raw output anyway — you may need to fix these fields manually.");
  }

  // Write the full result (campaign input + review notes)
  const fullOutput = {
    campaign_input: result.campaign_input,
    review_notes: result.review_notes,
    _metadata: {
      generated_at: new Date().toISOString(),
      model: MODEL,
      source_documents: docs.map(d => d.filename),
    },
  };

  fs.writeFileSync(
    outputPath.replace(".json", "-review.json"),
    JSON.stringify(fullOutput, null, 2),
  );

  // Also write just the campaign input (ready for generate.ts)
  fs.writeFileSync(
    outputPath,
    JSON.stringify(result.campaign_input, null, 2),
  );

  // Print review notes to console
  console.log("\n" + "=".repeat(60));
  console.log("INTAKE COMPLETE");
  console.log("=".repeat(60));

  console.log(`\nConfidence: ${result.review_notes.confidence}`);

  if (result.review_notes.gaps.length) {
    console.log("\nGaps (missing from source materials):");
    result.review_notes.gaps.forEach(g => console.log(`  - ${g}`));
  }

  if (result.review_notes.assumptions.length) {
    console.log("\nAssumptions made:");
    result.review_notes.assumptions.forEach(a => console.log(`  - ${a}`));
  }

  if (result.review_notes.suggestions.length) {
    console.log("\nSuggestions for improving the brief:");
    result.review_notes.suggestions.forEach(s => console.log(`  - ${s}`));
  }

  console.log(`\nCampaign input written to: ${outputPath}`);
  console.log(`Full review written to: ${outputPath.replace(".json", "-review.json")}`);
  console.log(`\nNext step: Review the JSON, fix any gaps, then run:`);
  console.log(`  npx tsx src/generate.ts ${outputPath}`);
}

// --- CLI Entry Point ---

function printUsage() {
  console.log(`
Usage: npx tsx src/intake.ts [options] <source-files-or-dirs...>

Takes strategy docs, meeting notes, and planning materials and produces
a structured campaign JSON for ad generation.

Arguments:
  <source-files-or-dirs>    One or more files (.txt, .md, .pdf, .docx) or
                            directories containing source documents

Options:
  -o, --output <path>       Output path for the campaign JSON
                            (default: campaign-input.json)
  -g, --guidance <text>     Additional guidance for the extraction
                            (e.g., "Focus on the CISO audience" or
                            "This is for a LinkedIn lead gen campaign")

Examples:
  npx tsx src/intake.ts docs/strategy.pdf docs/meeting-notes.md
  npx tsx src/intake.ts -o campaigns/q1-campaign.json docs/
  npx tsx src/intake.ts -g "Focus on the mid-market segment" docs/plan.docx
  `.trim());
}

// Parse CLI args
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(args.length === 0 ? 1 : 0);
}

let outputPath = "campaign-input.json";
let guidance: string | undefined;
const inputPaths: string[] = [];

for (let i = 0; i < args.length; i++) {
  if ((args[i] === "-o" || args[i] === "--output") && args[i + 1]) {
    outputPath = args[++i];
  } else if ((args[i] === "-g" || args[i] === "--guidance") && args[i + 1]) {
    guidance = args[++i];
  } else {
    inputPaths.push(args[i]);
  }
}

if (inputPaths.length === 0) {
  console.error("Error: At least one source file or directory is required.");
  printUsage();
  process.exit(1);
}

intake(inputPaths, path.resolve(outputPath), guidance)
  .catch(err => {
    console.error("Intake failed:", err);
    process.exit(1);
  });
