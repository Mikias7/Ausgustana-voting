import { Mail } from "lucide-react";
import { AdminPlaceholder } from "./AdminPlaceholder";

export function AdminMessagesPage() {
  return (
    <AdminPlaceholder
      title="Messages"
      description="Messages sent through the contact form."
      icon={<Mail className="size-6" aria-hidden="true" />}
      planned="An inbox for contact-form messages is coming in the next phase."
    />
  );
}
