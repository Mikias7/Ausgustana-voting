import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { CLASS_STANDINGS, IMPORT_MODES } from "@asa/shared";
import type { Env } from "../config/env";
import { decodeRosterFile } from "../middleware/upload";
import { getImportSummary, listImports, runImport } from "../services/import/importRoster.service";
import { getRosterStats, listStudents, type StudentListQuery } from "../services/students.service";

const booleanString = z.enum(["true", "false"]).transform((v) => v === "true");

export const importQuery = z.object({
  /** Defaults to a dry run so a forgotten flag never writes. */
  dryRun: booleanString.default("true"),
});

/** Multipart text fields that accompany the file. */
export const importBody = z.object({
  mode: z.enum(IMPORT_MODES).default("MERGE"),
  confirmDestructive: booleanString.default("false"),
});

export const importParams = z.object({ id: z.string().uuid() });

export const studentListQuery = z.object({
  search: z.string().trim().max(100).optional().transform((v) => v || undefined),
  class: z.enum([...CLASS_STANDINGS, "NONE"]).optional(),
  roster: z.enum(["on", "off", "all"]).default("all"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export function postImport(env: Pick<Env, "ALLOWED_EMAIL_DOMAINS">): RequestHandler {
  return async (req: Request, res: Response) => {
    const { dryRun } = req.query as unknown as z.infer<typeof importQuery>;
    const { mode, confirmDestructive } = req.body as z.infer<typeof importBody>;
    const { fileName, content } = decodeRosterFile(req.file);

    const summary = await runImport({
      fileName,
      content,
      mode,
      dryRun,
      confirmDestructive,
      actorId: req.user?.id ?? null,
      allowedEmailDomains: env.ALLOWED_EMAIL_DOMAINS,
    });
    res.status(dryRun ? 200 : 201).json(summary);
  };
}

export async function getImports(_req: Request, res: Response) {
  res.json(await listImports());
}

export async function getImport(req: Request, res: Response) {
  const { id } = req.params as z.infer<typeof importParams>;
  res.json(await getImportSummary(id));
}

export async function getStudents(req: Request, res: Response) {
  res.json(await listStudents(req.query as unknown as StudentListQuery));
}

export async function getStudentStats(_req: Request, res: Response) {
  res.json(await getRosterStats());
}

