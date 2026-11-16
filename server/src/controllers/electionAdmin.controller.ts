import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ELECTION_STATUSES, type ElectionInput, type ElectionUpdate, type PublishResultsInput } from "@asa/shared";
import { AppError } from "../utils/AppError";
import type { AuthUser } from "../services/auth/currentUser";
import { listManagedOrganizations } from "../services/admin/access";
import * as elections from "../services/admin/elections.service";
import * as positions from "../services/admin/positions.service";
import * as voterLists from "../services/admin/voterLists.service";
import * as results from "../services/results/results.service";

export const adminElectionListQuery = z.object({
  org: z.string().trim().toLowerCase().min(1).max(100).optional(),
  status: z.enum(ELECTION_STATUSES).optional(),
});

export const voterListQuery = z.object({
  org: z.string().trim().toLowerCase().min(1).max(100).optional(),
});

export const voterListRenameSchema = z.object({ name: z.string().trim().min(2).max(120) });

const uuid = z.string().uuid();

/** Malformed ids cannot match anything, so they are 404s rather than validation errors. */
export function uuidParams(...names: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const name of names) {
      if (!uuid.safeParse(req.params[name]).success) return next(AppError.notFound());
    }
    next();
  };
}

function me(req: Request): AuthUser {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
const param = (req: Request, name: string) => String(req.params[name]);

// ---------- organizations ----------

export async function getManagedOrganizations(req: Request, res: Response) {
  res.json(await listManagedOrganizations(me(req)));
}

// ---------- elections ----------

export async function getAdminElections(req: Request, res: Response) {
  res.json(await elections.listAdminElections(me(req), req.query as z.infer<typeof adminElectionListQuery>));
}

export async function postElection(req: Request, res: Response) {
  res.status(201).json(await elections.createElection(me(req), req.body as ElectionInput));
}

export async function getAdminElection(req: Request, res: Response) {
  res.json(await elections.getAdminElection(me(req), param(req, "id")));
}

export async function patchElection(req: Request, res: Response) {
  res.json(await elections.updateElection(me(req), param(req, "id"), req.body as ElectionUpdate));
}

export async function deleteElection(req: Request, res: Response) {
  await elections.deleteElection(me(req), param(req, "id"));
  res.status(204).end();
}

const transitions = {
  publish: elections.publishElection,
  unpublish: elections.unpublishElection,
  close: elections.closeElection,
  cancel: elections.cancelElection,
} as const;

export function electionTransition(name: keyof typeof transitions) {
  return async (req: Request, res: Response) => {
    res.json(await transitions[name](me(req), param(req, "id")));
  };
}

export async function postDuplicate(req: Request, res: Response) {
  res.status(201).json(await elections.duplicateElection(me(req), param(req, "id")));
}

// ---------- results ----------

export async function getElectionResults(req: Request, res: Response) {
  res.json(await results.getAdminResults(me(req), param(req, "id")));
}

export async function postPublishResults(req: Request, res: Response) {
  res.json(await results.publishResults(me(req), param(req, "id"), req.body as PublishResultsInput));
}

export async function postUnpublishResults(req: Request, res: Response) {
  res.json(await results.unpublishResults(me(req), param(req, "id")));
}

// ---------- positions ----------

export async function postPosition(req: Request, res: Response) {
  res.status(201).json(await positions.createPosition(me(req), param(req, "id"), req.body));
}

export async function patchPosition(req: Request, res: Response) {
  res.json(await positions.updatePosition(me(req), param(req, "positionId"), req.body));
}

export async function deletePosition(req: Request, res: Response) {
  await positions.deletePosition(me(req), param(req, "positionId"));
  res.status(204).end();
}

export async function putPositionOrder(req: Request, res: Response) {
  res.json(await positions.reorderPositions(me(req), param(req, "id"), (req.body as { ids: string[] }).ids));
}

// ---------- candidates ----------

export async function postCandidate(req: Request, res: Response) {
  res.status(201).json(await positions.createCandidate(me(req), param(req, "positionId"), req.body));
}

export async function patchCandidate(req: Request, res: Response) {
  res.json(await positions.updateCandidate(me(req), param(req, "candidateId"), req.body));
}

export async function deleteCandidate(req: Request, res: Response) {
  await positions.deleteCandidate(me(req), param(req, "candidateId"));
  res.status(204).end();
}

export async function putCandidateOrder(req: Request, res: Response) {
  res.json(await positions.reorderCandidates(me(req), param(req, "positionId"), (req.body as { ids: string[] }).ids));
}

// ---------- voter lists ----------

export async function getVoterLists(req: Request, res: Response) {
  res.json(await voterLists.listVoterLists(me(req), (req.query as z.infer<typeof voterListQuery>).org));
}

export async function postVoterList(req: Request, res: Response) {
  res.status(201).json(await voterLists.createVoterList(me(req), req.body));
}

export async function getVoterList(req: Request, res: Response) {
  res.json(await voterLists.getVoterList(me(req), param(req, "id")));
}

export async function patchVoterList(req: Request, res: Response) {
  res.json(await voterLists.renameVoterList(me(req), param(req, "id"), (req.body as { name: string }).name));
}

export async function putVoterListMembers(req: Request, res: Response) {
  res.json(await voterLists.replaceMembers(me(req), param(req, "id"), (req.body as { usernames: string[] }).usernames));
}

export async function deleteVoterList(req: Request, res: Response) {
  await voterLists.deleteVoterList(me(req), param(req, "id"));
  res.status(204).end();
}
