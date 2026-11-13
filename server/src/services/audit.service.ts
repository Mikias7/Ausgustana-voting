import type { Prisma, PrismaClient } from "@prisma/client";

/** The global client or an interactive-transaction client. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export interface AuditEntry {
  actorId: string | null;
  /** e.g. ROSTER_IMPORTED, ELECTION_PUBLISHED */
  action: string;
  entityType: string;
  entityId?: string | null;
  /**
   * Small, non-sensitive context (counts, mode, file name...). NEVER ballot
   * selections, receipt codes, or full roster rows.
   */
  metadata?: Prisma.InputJsonObject;
}

/** Appends one audit-log row. Pass the transaction client to make it atomic with the change. */
export async function recordAudit(db: DbClient, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      ...(entry.metadata ? { metadata: entry.metadata } : {}),
    },
  });
}
