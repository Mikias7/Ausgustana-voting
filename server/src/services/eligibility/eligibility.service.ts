import type { MyElectionStatus } from "@asa/shared";
import { prisma } from "../../utils/prisma";
import type { AuthUser } from "../auth/currentUser";
import { parseStoredRule } from "./isEligible";
import { computeMyStatus, type ElectionForStatus } from "./myStatus";

type ElectionWithId = ElectionForStatus & { id: string };

/** Voter-list IDs referenced by any rule in these elections. */
function referencedListIds(elections: ElectionWithId[]): string[] {
  const ids = new Set<string>();
  for (const e of elections) {
    for (const raw of [e.eligibility, ...e.positions.map((p) => p.eligibility)]) {
      const rule = parseStoredRule(raw);
      if (rule?.type === "VOTER_LIST") ids.add(rule.listId);
    }
  }
  return [...ids];
}

/**
 * Computes MyElectionStatus for many elections with two queries in total
 * (participation + voter-list membership), keyed by election id.
 */
export async function getMyStatuses(
  user: AuthUser,
  elections: ElectionWithId[],
): Promise<Map<string, MyElectionStatus>> {
  const electionIds = elections.map((e) => e.id);
  const listIds = referencedListIds(elections);

  const [participations, memberships] = await Promise.all([
    prisma.voterParticipation.findMany({
      where: { userId: user.id, electionId: { in: electionIds } },
      select: { electionId: true },
    }),
    listIds.length
      ? prisma.voterListMember.findMany({
          where: { username: user.username, voterListId: { in: listIds } },
          select: { voterListId: true },
        })
      : Promise.resolve([]),
  ]);

  const voted = new Set(participations.map((p) => p.electionId));
  const ctx = { voterListIds: new Set(memberships.map((m) => m.voterListId)) };

  return new Map(elections.map((e) => [e.id, computeMyStatus(e, user, ctx, voted.has(e.id))]));
}

/**
 * How many students are eligible under `rawRule` right now: the database
 * equivalent of isEligible(), used for turnout. Malformed rules count 0.
 */
export async function countEligibleVoters(rawRule: unknown): Promise<number> {
  const rule = parseStoredRule(rawRule);
  if (!rule) return 0;
  switch (rule.type) {
    case "ALL_STUDENTS":
      return prisma.user.count({ where: { onRoster: true } });
    case "CLASS_STANDING":
      return prisma.user.count({ where: { onRoster: true, classStanding: { in: rule.classes } } });
    case "VOTER_LIST": {
      const members = await prisma.voterListMember.findMany({
        where: { voterListId: rule.listId },
        select: { username: true },
      });
      if (members.length === 0) return 0;
      return prisma.user.count({ where: { onRoster: true, username: { in: members.map((m) => m.username) } } });
    }
  }
}
