/**
 * Ballot submission contract (docs/ARCHITECTURE.md §4.4).
 *
 * A voter submits ONE ballot per election covering exactly the positions they
 * are eligible for (MyElectionStatus.eligiblePositionIds). For each position
 * they either pick candidates (and/or one write-in), or abstain when allowed.
 * The server re-checks everything; the client-side check is for UX only.
 */
import { z } from "zod";

export const WRITE_IN_MAX_LENGTH = 80;

export const ballotChoiceSchema = z.object({
  positionId: z.string().uuid(),
  candidateIds: z.array(z.string().uuid()).max(20).default([]),
  /** Free-text name, only when the position allows write-ins. */
  writeIn: z
    .string()
    .trim()
    .max(WRITE_IN_MAX_LENGTH)
    .transform((s) => s.replace(/\s+/g, " "))
    .nullable()
    .optional()
    .transform((s) => (s ? s : null)),
  abstain: z.boolean().default(false),
});
export type BallotChoice = z.infer<typeof ballotChoiceSchema>;
export type BallotChoiceInput = z.input<typeof ballotChoiceSchema>;

export const ballotSubmissionSchema = z.object({
  choices: z.array(ballotChoiceSchema).min(1).max(50),
});
export type BallotSubmission = z.infer<typeof ballotSubmissionSchema>;
export type BallotSubmissionInput = z.input<typeof ballotSubmissionSchema>;

/** Problem with one position on a submitted ballot (400 INVALID_BALLOT details). */
export interface BallotIssue {
  positionId: string | null;
  message: string;
}

/** Receipt codes look like `K7QM-3XRT-P9WD` (no 0/O or 1/I/L; about 59 random bits). */
export const RECEIPT_CODE_PATTERN = /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

export const receiptCheckSchema = z.object({
  code: z.string().trim().min(1).max(40),
});

/** Result of checking a receipt code. Never reveals the ballot's contents. */
export interface ReceiptCheck {
  recorded: boolean;
  election: { id: string; title: string } | null;
}
