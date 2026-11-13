import { api } from "./client";

/** Body for POST /api/contact. Proposed for @asa/shared as a zod schema (`contactMessageSchema`). */
export interface ContactMessageInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/** Client-side limits; keep in sync with the server validator. */
export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  subject: 150,
  messageMin: 10,
  messageMax: 5000,
} as const;

export function sendContactMessage(input: ContactMessageInput): Promise<void> {
  return api.post<void>("/contact", input);
}
