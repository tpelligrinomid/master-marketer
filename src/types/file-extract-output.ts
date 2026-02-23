export interface FileExtractOutput {
  content_markdown: string;
  title?: string;
  word_count?: number;
  page_count?: number;
  extraction_method: string;
}
