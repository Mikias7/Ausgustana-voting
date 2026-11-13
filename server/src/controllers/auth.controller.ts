import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../utils/AppError";
import { toCurrentUser } from "../services/auth/currentUser";
import { signIn, signOut } from "../services/auth/session";
import { findDevLoginUser, listDevUsers } from "../services/auth/devAuth.service";

export const SESSION_COOKIE_NAME = "asa.sid";

export const devLoginBody = z.object({
  username: z.string().trim().toLowerCase().min(1, "Username is required").max(100),
});

export function me(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  res.json(toCurrentUser(req.user));
}

export async function logout(req: Request, res: Response) {
  await signOut(req);
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  res.status(204).end();
}

export async function devUsers(_req: Request, res: Response) {
  res.json(await listDevUsers());
}

export async function devLogin(req: Request, res: Response) {
  const { username } = req.body as z.infer<typeof devLoginBody>;
  const user = await findDevLoginUser(username);
  await signIn(req, user.id);
  res.json(toCurrentUser(user));
}
