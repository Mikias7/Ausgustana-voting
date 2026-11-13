import { prisma } from "../../utils/prisma";

/** Empties every application table in the test database (migrations table kept). */
export async function resetDatabase(): Promise<void> {
  if (!/test/i.test(new URL(process.env.DATABASE_URL ?? "").pathname)) {
    throw new Error("resetDatabase() refused: DATABASE_URL is not a test database");
  }
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
