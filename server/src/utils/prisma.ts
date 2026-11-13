import { PrismaClient } from "@prisma/client";

// One client per process. In dev, tsx watch restarts the whole process,
// so no globalThis caching is needed. Connects lazily on first query.
export const prisma = new PrismaClient();
