import type { Request, Response } from "express";
import { z } from "zod";
import { ELECTION_LIST_PHASES, getElectionDetail, listElections } from "../services/elections.service";
import { listOrganizations } from "../services/organizations.service";
import { listPublishedAnnouncements } from "../services/announcements.service";
import { getProfile } from "../services/profile.service";
import { AppError } from "../utils/AppError";

export const electionListQuery = z.object({
  phase: z.enum(ELECTION_LIST_PHASES).optional(),
  org: z.string().trim().toLowerCase().min(1).max(100).optional(),
});

const uuid = z.string().uuid();

export async function getElections(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof electionListQuery>;
  res.json(await listElections(query, req.user));
}

export async function getElection(req: Request, res: Response) {
  const id = String(req.params.id);
  // A malformed id cannot match any election, so treat it as not found.
  if (!uuid.safeParse(id).success) throw AppError.notFound("Election not found");
  res.json(await getElectionDetail(id, req.user));
}

export async function getOrganizations(_req: Request, res: Response) {
  res.json(await listOrganizations());
}

export async function getAnnouncements(_req: Request, res: Response) {
  res.json(await listPublishedAnnouncements());
}

export async function getMe(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  res.json(await getProfile(req.user));
}
