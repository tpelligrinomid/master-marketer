import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const FETCH_TIMEOUT = 30_000; // 30 seconds

/**
 * Determine file type from Content-Type header or URL extension.
 */
function detectFileType(
  contentType: string | null,
  url: string
): "pdf" | "docx" | "text" {
  if (contentType) {
    if (contentType.includes("pdf")) return "pdf";
    if (
      contentType.includes(
        "vnd.openxmlformats-officedocument.wordprocessingml"
      ) ||
      contentType.includes("msword")
    )
      return "docx";
    if (
      contentType.includes("text/") ||
      contentType.includes("application/json") ||
      contentType.includes("application/octet-stream")
    ) {
      // For octet-stream, fall through to extension check
      if (!contentType.includes("octet-stream")) return "text";
    }
  }

  // Fall back to URL extension
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".pdf")) return "pdf";
  if (pathname.endsWith(".docx") || pathname.endsWith(".doc")) return "docx";
  if (
    pathname.endsWith(".txt") ||
    pathname.endsWith(".md") ||
    pathname.endsWith(".markdown")
  )
    return "text";

  // Default to text for octet-stream without recognizable extension
  if (contentType?.includes("application/octet-stream")) return "text";

  throw new Error(
    `Unsupported file type. Content-Type: ${contentType}, URL: ${url}. Supported: .pdf, .docx, .doc, .txt, .md`
  );
}

/**
 * Fetch a file from a URL and extract its text content.
 * Supports PDF (via pdf-parse), DOCX/DOC (via mammoth), and plain text files.
 */
export async function fetchAndParseFile(fileUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(fileUrl, { signal: controller.signal });
    clearTimeout(timeout);
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`File fetch timed out after ${FETCH_TIMEOUT / 1000}s: ${fileUrl}`);
    }
    throw new Error(`Failed to fetch file: ${fileUrl} — ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    throw new Error(
      `File fetch failed with status ${response.status}: ${fileUrl}`
    );
  }

  const contentType = response.headers.get("content-type");
  const fileType = detectFileType(contentType, fileUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  switch (fileType) {
    case "pdf": {
      const parsed = await pdfParse(buffer);
      if (!parsed.text?.trim()) {
        throw new Error("PDF parsed but contained no extractable text");
      }
      return parsed.text;
    }
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      if (!result.value?.trim()) {
        throw new Error("DOCX parsed but contained no extractable text");
      }
      return result.value;
    }
    case "text": {
      const text = buffer.toString("utf-8");
      if (!text.trim()) {
        throw new Error("File fetched but contained no text");
      }
      return text;
    }
  }
}
