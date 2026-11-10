export const MAX_TASK_FILES = 10;
export const MAX_TASK_FILE_BYTES = 10 * 1024 * 1024;
export const TASK_ATTACHMENT_TTL = 3600;
export const TASK_FILE_ACCEPT = ".jpg,.jpeg,.png,.gif,.webp,.avif,.bmp,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip";

export function validateTaskFiles(files: { name: string; size: number }[], existing: number): string | null {
  if (existing + files.length > MAX_TASK_FILES) return "Máximo 10 archivos por tarea";
  for (const file of files) {
    if (file.size > MAX_TASK_FILE_BYTES) return `${file.name}: máximo 10 MB por archivo`;
    if (!/\.(jpg|jpeg|png|gif|webp|avif|bmp|heic|heif|pdf|doc|docx|xls|xlsx|ppt|pptx|zip)$/i.test(file.name)) return `${file.name}: tipo de archivo no permitido`;
  }
  return null;
}

export function fileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export type TaskAttachment = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  downloadUrl: string;
};