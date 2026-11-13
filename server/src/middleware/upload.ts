import path from "node:path";
import multer from "multer";
import { AppError } from "../utils/AppError";

export const ROSTER_MAX_BYTES = 2 * 1024 * 1024;

const ROSTER_EXTENSIONS = new Set([".txt", ".csv"]);
const ROSTER_MIME_TYPES = new Set(["text/plain", "text/csv", "application/octet-stream", "application/vnd.ms-excel"]);

/**
 * Single roster upload in field "file", kept in memory only (never written to
 * disk). Multer errors (size, unexpected field...) are mapped by the error handler.
 */
const options: multer.Options & { defParamCharset?: string } = {
  storage: multer.memoryStorage(),
  // UTF-8 file names (multer 2 supports it; @types/multer lags behind).
  defParamCharset: "utf8",
  limits: { fileSize: ROSTER_MAX_BYTES, files: 1, fields: 10, fieldSize: 1024, parts: 12 },
  fileFilter: (_req, file, accept) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase().split(";")[0]!.trim();
    if (!ROSTER_EXTENSIONS.has(ext) || !ROSTER_MIME_TYPES.has(mime)) {
      return accept(new AppError(400, "UNSUPPORTED_FILE_TYPE", "Upload a plain-text roster file (.txt or .csv)."));
    }
    accept(null, true);
  },
};

export const rosterUpload = multer(options).single("file");

const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });

/** Decodes an uploaded roster as UTF-8 (BOM stripped). Rejects binary or non-UTF-8 content. */
export function decodeRosterFile(file: Express.Multer.File | undefined): { fileName: string; content: string } {
  if (!file) throw new AppError(400, "FILE_REQUIRED", "Choose a roster file to upload.");

  let content: string;
  try {
    content = utf8.decode(file.buffer);
  } catch {
    throw new AppError(400, "INVALID_FILE_ENCODING", "The file is not UTF-8 text. Re-save it as UTF-8 and try again.");
  }
  if (content.includes("\u0000")) {
    throw new AppError(400, "UNSUPPORTED_FILE_TYPE", "The file looks binary, not a plain-text roster.");
  }

  const fileName = path.basename(file.originalname.replace(/\\/g, "/")).trim().slice(0, 255) || "roster.txt";
  return { fileName, content };
}
