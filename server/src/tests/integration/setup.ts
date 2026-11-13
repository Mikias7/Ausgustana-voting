import { afterAll, beforeAll } from "vitest";
import { prisma } from "../../utils/prisma";
import { resetDatabase } from "./db";

// Each integration test file starts from an empty database.
beforeAll(resetDatabase);
afterAll(() => prisma.$disconnect());
