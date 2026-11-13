import type { AnnouncementDto } from "@asa/shared";
import { prisma } from "../utils/prisma";

const PUBLIC_LIMIT = 10;

/** Published announcements (publishedAt in the past), newest first. */
export async function listPublishedAnnouncements(): Promise<AnnouncementDto[]> {
  const announcements = await prisma.announcement.findMany({
    where: { publishedAt: { not: null, lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take: PUBLIC_LIMIT,
    include: { organization: { select: { name: true } } },
  });
  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    organizationName: a.organization?.name ?? null,
    publishedAt: a.publishedAt!.toISOString(),
  }));
}
