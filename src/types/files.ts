import { z } from "zod";
import { FILE_TYPES } from "./platforms";

export const UploadFileSchema = z.object({
  file_type: z.enum(FILE_TYPES).default("other"),
});

export type UploadFileInput = z.infer<typeof UploadFileSchema>;

export interface ProjectFile {
  id: string;
  project_id: string;
  original_name: string;
  mime_type: string;
  storage_path: string;
  file_size: number | null;
  extracted_text: string | null;
  extraction_status: "pending" | "processing" | "complete" | "failed";
  file_type: string;
  created_at: string;
}
