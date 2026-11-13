import type { ProfileDto } from "@asa/shared";
import { prisma } from "../utils/prisma";
import { toCurrentUser, type AuthUser } from "./auth/currentUser";

/** Profile + participation history. Participation says THAT the user voted, never how. */
export async function getProfile(user: AuthUser): Promise<ProfileDto> {
  const participations = await prisma.voterParticipation.findMany({
    where: { userId: user.id },
    orderBy: { votedAt: "desc" },
    select: {
      votedAt: true,
      election: { select: { id: true, title: true, organization: { select: { name: true } } } },
    },
  });

  return {
    ...toCurrentUser(user),
    participations: participations.map((p) => ({
      electionId: p.election.id,
      electionTitle: p.election.title,
      organizationName: p.election.organization.name,
      votedAt: p.votedAt.toISOString(),
    })),
  };
}
