import { Prisma } from "@prisma/client";
import { getElectionPhase, type VoterListDetail, type VoterListSummary } from "@asa/shared";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/AppError";
import { recordAudit, type DbClient } from "../audit.service";
import type { AuthUser } from "../auth/currentUser";
import { assertCanManageOrg, resolveOrgFilter } from "./access";
import { lockedError } from "./elections.service";

const orgSelect = { select: { id: true, name: true, slug: true } } as const;

interface Counts {
  memberCount: number;
  unknownCount: number;
}

/**
 * Member and "unknown" counts per list. Unknown = no on-roster user with that
 * username (never imported, or currently off the roster).
 */
async function countMembers(ids: string[]): Promise<Map<string, Counts>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ id: string; total: number; unknown: number }[]>`
    SELECT m.voter_list_id::text AS id,
           count(*)::int AS total,
           count(*) FILTER (WHERE u.on_roster IS NOT TRUE)::int AS unknown
      FROM voter_list_members m
      LEFT JOIN users u ON u.username = m.username
     WHERE m.voter_list_id::text IN (${Prisma.join(ids)})
     GROUP BY m.voter_list_id`;
  return new Map(rows.map((r) => [r.id, { memberCount: r.total, unknownCount: r.unknown }]));
}

async function managedList(user: AuthUser, id: string) {
  const list = await prisma.voterList.findUnique({ where: { id }, include: { organization: orgSelect } });
  if (!list) throw AppError.notFound("Voter list not found");
  assertCanManageOrg(user, list.organizationId);
  return list;
}

/** Elections whose election-level or position-level rule references the list. */
function electionsUsingList(db: DbClient, listId: string) {
  return db.election.findMany({
    where: {
      OR: [
        { eligibility: { path: ["listId"], equals: listId } },
        { positions: { some: { eligibility: { path: ["listId"], equals: listId } } } },
      ],
    },
    select: { id: true, title: true, status: true, startsAt: true, endsAt: true, closedAt: true },
  });
}

export async function listVoterLists(user: AuthUser, org: string | undefined): Promise<VoterListSummary[]> {
  const orgIds = await resolveOrgFilter(user, org);
  const lists = await prisma.voterList.findMany({
    where: orgIds ? { organizationId: { in: orgIds } } : {},
    include: { organization: orgSelect },
    orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
  });
  const counts = await countMembers(lists.map((l) => l.id));
  return lists.map((l) => ({
    id: l.id,
    name: l.name,
    organization: l.organization,
    ...(counts.get(l.id) ?? { memberCount: 0, unknownCount: 0 }),
  }));
}

export async function getVoterList(user: AuthUser, id: string): Promise<VoterListDetail> {
  const list = await managedList(user, id);
  const members = await prisma.voterListMember.findMany({
    where: { voterListId: id },
    orderBy: { username: "asc" },
    select: { username: true },
  });
  const users = await prisma.user.findMany({
    where: { username: { in: members.map((m) => m.username) } },
    select: { username: true, firstName: true, lastName: true, onRoster: true },
  });
  const byUsername = new Map(users.map((u) => [u.username, u]));
  const rows = members.map((m) => {
    const u = byUsername.get(m.username);
    return { username: m.username, name: u ? `${u.firstName} ${u.lastName}` : null, onRoster: u?.onRoster ?? false };
  });
  return {
    id: list.id,
    name: list.name,
    organization: list.organization,
    memberCount: rows.length,
    unknownCount: rows.filter((r) => !r.onRoster).length,
    members: rows,
  };
}

export async function createVoterList(user: AuthUser, input: { organizationId: string; name: string }): Promise<VoterListDetail> {
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId }, select: { id: true } });
  if (!org) throw AppError.notFound("Organization not found");
  assertCanManageOrg(user, org.id);

  const id = await prisma.$transaction(async (tx) => {
    const list = await tx.voterList.create({ data: { organizationId: org.id, name: input.name } });
    await recordAudit(tx, {
      actorId: user.id,
      action: "VOTER_LIST_CREATED",
      entityType: "VoterList",
      entityId: list.id,
      metadata: { organizationId: org.id },
    });
    return list.id;
  });
  return getVoterList(user, id);
}

export async function renameVoterList(user: AuthUser, id: string, name: string): Promise<VoterListDetail> {
  const list = await managedList(user, id);
  if (list.name !== name) {
    await prisma.$transaction(async (tx) => {
      await tx.voterList.update({ where: { id }, data: { name } });
      await recordAudit(tx, {
        actorId: user.id,
        action: "VOTER_LIST_UPDATED",
        entityType: "VoterList",
        entityId: id,
        metadata: { fields: ["name"] },
      });
    });
  }
  return getVoterList(user, id);
}

/** Replaces the member list. Refused while an election using the list is open. */
export async function replaceMembers(user: AuthUser, id: string, usernames: string[]): Promise<VoterListDetail> {
  await managedList(user, id);
  const unique = [...new Set(usernames)];
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const open = (await electionsUsingList(tx, id)).filter((e) => getElectionPhase(e, now) === "open");
    if (open.length > 0) {
      throw lockedError("This list is used by an election that is open for voting; its members cannot change now", {
        elections: open.map((e) => ({ id: e.id, title: e.title })),
      });
    }
    await tx.voterListMember.deleteMany({ where: { voterListId: id } });
    if (unique.length > 0) {
      await tx.voterListMember.createMany({ data: unique.map((username) => ({ voterListId: id, username })) });
    }
    await recordAudit(tx, {
      actorId: user.id,
      action: "VOTER_LIST_MEMBERS_REPLACED",
      entityType: "VoterList",
      entityId: id,
      metadata: { memberCount: unique.length },
    });
  });
  return getVoterList(user, id);
}

export async function deleteVoterList(user: AuthUser, id: string): Promise<void> {
  const list = await managedList(user, id);
  await prisma.$transaction(async (tx) => {
    const using = await electionsUsingList(tx, id);
    if (using.length > 0) {
      throw new AppError(409, "VOTER_LIST_IN_USE", "This list is used by an election's eligibility rules", {
        elections: using.map((e) => ({ id: e.id, title: e.title })),
      });
    }
    await tx.voterList.delete({ where: { id } }); // members cascade
    await recordAudit(tx, {
      actorId: user.id,
      action: "VOTER_LIST_DELETED",
      entityType: "VoterList",
      entityId: id,
      metadata: { organizationId: list.organizationId, name: list.name },
    });
  });
}
