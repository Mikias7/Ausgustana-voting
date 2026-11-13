import type { Request, Response } from "express";
import { z } from "zod";
import type { BallotSubmission } from "@asa/shared";
import { castVote, checkReceipt } from "../services/voting/vote.service";
import { AppError } from "../utils/AppError";

const uuid = z.string().uuid();

export async function postVote(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const id = String(req.params.id);
  if (!uuid.safeParse(id).success) throw AppError.notFound("Election not found");
  res.status(201).json(await castVote(req.user, id, req.body as BallotSubmission));
}

export async function postReceiptCheck(req: Request, res: Response) {
  res.json(await checkReceipt((req.body as { code: string }).code));
}
