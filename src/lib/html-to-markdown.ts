import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";

export interface ExtractedArticle {
  title: string;
  content_markdown: string;
  author?: string;
  published_date?: string;
  meta_description?: string;
  word_count: number;
}

/**
 * Extract article content from raw HTML and convert to clean markdown.
 * Uses Mozilla Readability for content extraction and Turndown for HTML→MD.
 */
export function extractArticle(html: string, url: string): ExtractedArticle {
  const { document } = parseHTML(html);

  // --- Extract metadata from <head> ---
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
  const htmlTitle = document.querySelector("title")?.textContent;
  const h1Title = document.querySelector("h1")?.textContent;

  const metaDescription =
    document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
    document.querySelector('meta[name="description"]')?.getAttribute("content") ||
    undefined;

  const publishedDate =
    document.querySelector('meta[property="article:published_time"]')?.getAttribute("content") ||
    document.querySelector('meta[name="date"]')?.getAttribute("content") ||
    document.querySelector("time[datetime]")?.getAttribute("datetime") ||
    undefined;

  const author =
    document.querySelector('meta[name="author"]')?.getAttribute("content") ||
    document.querySelector('meta[property="article:author"]')?.getAttribute("content") ||
    document.querySelector('[rel="author"]')?.textContent?.trim() ||
    document.querySelector(".author")?.textContent?.trim() ||
    document.querySelector(".byline")?.textContent?.trim() ||
    undefined;

  // --- Extract article content with Readability ---
  const reader = new Readability(document as any);
  const article = reader.parse();

  let contentHtml: string;
  let readabilityTitle: string | undefined;
  let readabilityByline: string | undefined;

  if (article && article.content) {
    contentHtml = article.content;
    readabilityTitle = article.title || undefined;
    readabilityByline = article.byline || undefined;
  } else {
    // Fallback: use full body
    contentHtml = document.querySelector("body")?.innerHTML || html;
  }

  // --- Convert HTML to Markdown ---
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  // Strip empty links and images with no src
  turndown.addRule("emptyLinks", {
    filter: (node) =>
      node.nodeName === "A" && !node.getAttribute("href"),
    replacement: () => "",
  });

  turndown.addRule("emptyImages", {
    filter: (node) =>
      node.nodeName === "IMG" && !node.getAttribute("src"),
    replacement: () => "",
  });

  let markdown = turndown.turndown(contentHtml);

  // Post-process: collapse 3+ consecutive newlines into 2, trim
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  // --- Resolve title (priority: h1 > og:title > readability > <title>) ---
  const title = h1Title?.trim() || ogTitle?.trim() || readabilityTitle?.trim() || htmlTitle?.trim() || url;

  // --- Resolve author ---
  const finalAuthor = author || readabilityByline || undefined;

  // --- Normalize published_date to ISO date string ---
  let normalizedDate: string | undefined;
  if (publishedDate) {
    try {
      const d = new Date(publishedDate);
      if (!isNaN(d.getTime())) {
        normalizedDate = d.toISOString().slice(0, 10);
      }
    } catch {
      // ignore invalid dates
    }
  }

  // --- Word count ---
  const wordCount = markdown.split(/\s+/).filter((w) => w.length > 0).length;

  return {
    title,
    content_markdown: markdown,
    author: finalAuthor,
    published_date: normalizedDate,
    meta_description: metaDescription,
    word_count: wordCount,
  };
}
