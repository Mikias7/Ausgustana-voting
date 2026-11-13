import { z } from "zod";
import { CLASS_STANDINGS } from "./enums";

/**
 * Eligibility rules decide who may vote in an election or for a position.
 * To add a new rule type: add a schema to the union below, then handle it
 * in server/src/services/eligibility/isEligible.ts.
 */
export const eligibilityRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ALL_STUDENTS") }),
  z.object({
    type: z.literal("CLASS_STANDING"),
    classes: z.array(z.enum(CLASS_STANDINGS)).min(1),
  }),
  z.object({
    type: z.literal("VOTER_LIST"),
    listId: z.string().uuid(),
  }),
]);

export type EligibilityRule = z.infer<typeof eligibilityRuleSchema>;

export const ALL_STUDENTS_RULE: EligibilityRule = { type: "ALL_STUDENTS" };
