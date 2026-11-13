import type { ClassStanding, PlatformRole } from "@asa/shared";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/AppError";
import { findAuthUserByUsername, type AuthUser } from "./currentUser";

/** Row in the dev "sign in as" picker. Development only. */
export interface DevUserOption {
  id: string;
  username: string;
  name: string;
  classStanding: ClassStanding | null;
  platformRole: PlatformRole;
}

export async function listDevUsers(): Promise<DevUserOption[]> {
  const users = await prisma.user.findMany({
    orderBy: [{ platformRole: "desc" }, { username: "asc" }],
    select: { id: true, username: true, firstName: true, lastName: true, classStanding: true, platformRole: true },
  });
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    name: `${u.firstName} ${u.lastName}`,
    classStanding: u.classStanding,
    platformRole: u.platformRole,
  }));
}

export async function findDevLoginUser(username: string): Promise<AuthUser> {
  const user = await findAuthUserByUsername(username);
  if (!user) throw new AppError(404, "USER_NOT_FOUND", `No user named "${username}"`);
  return user;
}
