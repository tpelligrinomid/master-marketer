import { task, metadata } from "@trigger.dev/sdk/v3";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";
import TurndownService from "turndown";
import { FileExtractInput } from "../src/types/file-extract-input";
import { FileExtractOutput } from "../src/types/file-extract-output";

const FETCH_TIMEOUT_MS = 30_000;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const MIN_WORD_COUNT = 10;
const CALLBACK_MAX_RETRIES = 3;
const CALLBACK_RETRY_DELAY_MS = 5_000;

interface ExtractPayload extends FileExtractInput {
  _jobId?: string;
  _apiKey?: string;
}

async function callbackWithRetry(
  callbackUrl: string,
  apiKey: string,
  payload: Record<string, unknown>
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };

  for (let attempt = 1; attempt <= CALLBACK_MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[file-extract] Callback to ${callbackUrl} (attempt ${attempt}/${CALLBACK_MAX_RETRIES})`
      );
      const response = await fetch(callbackUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`[file-extract] Callback delivered successfully`);
        return;
      }

      const text = await response.text().catch(() => "");
      console.warn(
        `[file-extract] Callback attempt ${attempt} got ${response.status}: ${text}`
      );
    } catch (err) {
      console.warn(
        `[file-extract] Callback attempt ${attempt} failed:`,
        err instanceof Error ? err.message : err
      );
    }

    if (attempt < CALLBACK_MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, CALLBACK_RETRY_DELAY_MS * attempt));
    }
  }

  console.error(
    `[file-extract] Failed to deliver callback to ${callbackUrl} after ${CALLBACK_MAX_RETRIES} attempts`
  );
}

// --- PDF extraction ---

async function extractPdf(buffer: Buffer): Promise<FileExtractOutput> {
  const data = await pdfParse(buffer);

  if (!data.text?.trim()) {
    throw new Error("PDF parsed but contained no extractable text — file may be scanned/image-based or encrypted");
  }

  // Basic markdown formatting: preserve paragraph breaks
  let markdown = data.text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const title = data.info?.Title || undefined;

  return {
    content_markdown: markdown,
    title,
    word_count: markdown.split(/\s+/).filter(Boolean).length,
    page_count: data.numpages,
    extraction_method: "pdf-parse",
  };
}

// --- DOCX extraction ---

async function extractDocx(buffer: Buffer): Promise<FileExtractOutput> {
  const result = await mammoth.convertToHtml({ buffer });

  if (!result.value?.trim()) {
    throw new Error("DOCX parsed but contained no extractable text");
  }

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  let markdown = turndown.turndown(result.value);
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  return {
    content_markdown: markdown,
    word_count: markdown.split(/\s+/).filter(Boolean).length,
    extraction_method: "mammoth",
  };
}

// --- PPTX extraction ---

async function extractPptx(buffer: Buffer): Promise<FileExtractOutput> {
  const zip = await JSZip.loadAsync(buffer);
  const slides: string[] = [];

  let slideNum = 1;
  while (zip.files[`ppt/slides/slide${slideNum}.xml`]) {
    const xml = await zip.files[`ppt/slides/slide${slideNum}.xml`].async("text");

    // Extract text from <a:t> elements, grouped by <a:p> paragraphs
    const paragraphs: string[] = [];
    const pMatches = xml.match(/<a:p[^>]*>[\s\S]*?<\/a:p>/g) || [];

    for (const pBlock of pMatches) {
      const textParts: string[] = [];
      const tMatches = pBlock.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];

      for (const tBlock of tMatches) {
        const textContent = tBlock.replace(/<[^>]*>/g, "").trim();
        if (textContent) {
          textParts.push(textContent);
        }
      }

      if (textParts.length > 0) {
        paragraphs.push(textParts.join(""));
      }
    }

    if (paragraphs.length > 0) {
      let slideMarkdown = `# Slide ${slideNum}`;

      // Use first paragraph as slide title if it looks like one
      if (paragraphs.length > 1) {
        slideMarkdown += `: ${paragraphs[0]}\n\n`;
        slideMarkdown += paragraphs.slice(1).map((p) => `${p}`).join("\n\n");
      } else {
        slideMarkdown += `\n\n${paragraphs[0]}`;
      }

      slides.push(slideMarkdown);
    }

    slideNum++;
  }

  if (slides.length === 0) {
    throw new Error("PPTX parsed but no text content found in any slides");
  }

  // Check for speaker notes
  for (let i = 1; i < slideNum; i++) {
    const notesFile = zip.files[`ppt/notesSlides/notesSlide${i}.xml`];
    if (notesFile) {
      const notesXml = await notesFile.async("text");
      const noteTexts: string[] = [];
      const pMatches = notesXml.match(/<a:p[^>]*>[\s\S]*?<\/a:p>/g) || [];

      for (const pBlock of pMatches) {
        const textParts: string[] = [];
        const tMatches = pBlock.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
        for (const tBlock of tMatches) {
          const textContent = tBlock.replace(/<[^>]*>/g, "").trim();
          if (textContent) textParts.push(textContent);
        }
        if (textParts.length > 0) noteTexts.push(textParts.join(""));
      }

      // Filter out the slide number placeholder text
      const meaningfulNotes = noteTexts.filter(
        (t) => !/^\d+$/.test(t) && t.length > 1
      );

      if (meaningfulNotes.length > 0 && slides[i - 1]) {
        slides[i - 1] += `\n\n*Speaker notes: ${meaningfulNotes.join(" ")}*`;
      }
    }
  }

  let markdown = slides.join("\n\n---\n\n");
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  return {
    content_markdown: markdown,
    word_count: markdown.split(/\s+/).filter(Boolean).length,
    page_count: slideNum - 1,
    extraction_method: "pptx-parser",
  };
}

// --- Main task ---

export const fileExtract = task({
  id: "file-extract",
  maxDuration: 120,
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: ExtractPayload): Promise<FileExtractOutput | null> => {
    const { file_url, file_name, mime_type, callback_url, _jobId, _apiKey, metadata: inputMetadata } = payload;
    const apiKey = _apiKey || process.env.API_KEY || "";

    try {
      // Step 1: Download file
      metadata.set("progress", `Downloading ${file_name}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(file_url, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new Error(`File download failed: HTTP ${response.status} ${response.statusText}`);
      }

      const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
      if (contentLength > MAX_FILE_SIZE) {
        throw new Error(`File too large (${Math.round(contentLength / 1024 / 1024)}MB, max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Step 2: Extract based on MIME type
      metadata.set("progress", `Extracting text from ${file_name}`);

      let output: FileExtractOutput;

      switch (mime_type) {
        case "application/pdf":
          output = await extractPdf(buffer);
          break;
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          output = await extractDocx(buffer);
          break;
        case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
          output = await extractPptx(buffer);
          break;
      }

      // Step 3: Validate
      if (output.word_count !== undefined && output.word_count < MIN_WORD_COUNT) {
        throw new Error(
          `Extracted content too short (${output.word_count} words, minimum ${MIN_WORD_COUNT})`
        );
      }

      // Step 4: Callback
      if (callback_url) {
        metadata.set("progress", "Delivering results via callback");

        await callbackWithRetry(callback_url, apiKey, {
          job_id: _jobId || "unknown",
          status: "completed",
          metadata: inputMetadata,
          output,
        });
      }

      metadata.set("progress", "Complete");
      return output;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[file-extract] Failed for ${file_name}: ${errorMessage}`);

      if (callback_url) {
        metadata.set("progress", "Delivering failure callback");

        await callbackWithRetry(callback_url, apiKey, {
          job_id: _jobId || "unknown",
          status: "failed",
          metadata: inputMetadata,
          error: `Failed to extract text from ${file_name}: ${errorMessage}`,
        });
      }

      metadata.set("progress", "Failed");
      return null;
    }
  },
});
