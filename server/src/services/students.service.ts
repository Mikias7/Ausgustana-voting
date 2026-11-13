import type { Prisma } from "@prisma/client";
import type { ClassStanding, Paginated, RosterStats, StudentListItem } from "@asa/shared";
import { CLASS_STANDINGS } from "@asa/shared";
import { prisma } from "../utils/prisma";

export interface StudentListQuery {
  search?: string;
  class?: ClassStanding | "NONE";
  roster: "on" | "off" | "all";
  page: number;
  pageSize: number;
}

/** Admin roster view: STUDENT accounts only (platform admins are not on the roster list). */
export async function listStudents(query: StudentListQuery): Promise<Paginated<StudentListItem>> {
  const where: Prisma.UserWhereInput = { platformRole: "STUDENT" };

  if (query.search) {
    const contains = { contains: query.search, mode: "insensitive" as const };
    where.OR = [{ username: contains }, { email: contains }, { firstName: contains }, { lastName: contains }];
  }
  if (query.class) where.classStanding = query.class === "NONE" ? null : query.class;
  if (query.roster !== "all") where.onRoster = query.roster === "on";

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { username: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        classStanding: true,
        onRoster: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    items: users.map((u) => ({ ...u, updatedAt: u.updatedAt.toISOString() })),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

/** Header numbers for the admin Students page. byClass counts on-roster students only. */
export async function getRosterStats(): Promise<RosterStats> {
  const [onRoster, offRoster, classes, lastImport] = await Promise.all([
    prisma.user.count({ where: { platformRole: "STUDENT", onRoster: true } }),
    prisma.user.count({ where: { platformRole: "STUDENT", onRoster: false } }),
    prisma.user.groupBy({
      by: ["classStanding"],
      where: { platformRole: "STUDENT", onRoster: true },
      _count: { _all: true },
    }),
    prisma.studentImport.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  const byClass = Object.fromEntries([...CLASS_STANDINGS, "NONE"].map((c) => [c, 0])) as RosterStats["byClass"];
  for (const group of classes) byClass[group.classStanding ?? "NONE"] = group._count._all;

  return { onRoster, offRoster, byClass, lastImportAt: lastImport?.createdAt.toISOString() ?? null };
}
