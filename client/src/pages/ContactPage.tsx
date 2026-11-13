import { useState, type FormEvent } from "react";
import { ArrowUpRight, Mail, MapPin, Phone, Globe } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { CONTACT_LIMITS, sendContactMessage, type ContactMessageInput } from "../api/contact";
import { ASA_CONTACT, BRAND } from "../components/layout/brand";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { GroupedList } from "../components/ui/GroupedList";
import { Input } from "../components/ui/Input";
import { ListRow } from "../components/ui/ListRow";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Textarea } from "../components/ui/Textarea";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { fullName } from "../utils/text";

type Errors = Partial<Record<keyof ContactMessageInput, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(values: ContactMessageInput): Errors {
  const errors: Errors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const subject = values.subject.trim();
  const message = values.message.trim();
  if (!name) errors.name = "Please enter your name.";
  else if (name.length > CONTACT_LIMITS.name) errors.name = `Name must be ${CONTACT_LIMITS.name} characters or fewer.`;
  if (!email) errors.email = "Please enter your email address.";
  else if (!EMAIL_RE.test(email) || email.length > CONTACT_LIMITS.email) errors.email = "Please enter a valid email address.";
  if (!subject) errors.subject = "Please enter a subject.";
  else if (subject.length > CONTACT_LIMITS.subject) errors.subject = `Subject must be ${CONTACT_LIMITS.subject} characters or fewer.`;
  if (message.length < CONTACT_LIMITS.messageMin) errors.message = `Please write at least ${CONTACT_LIMITS.messageMin} characters.`;
  else if (message.length > CONTACT_LIMITS.messageMax) errors.message = `Message must be ${CONTACT_LIMITS.messageMax} characters or fewer.`;
  return errors;
}

const iconClass = "size-5";

function ContactInfo() {
  return (
    <div className="space-y-4">
      <GroupedList title={BRAND.orgName}>
        <ListRow
          href={`mailto:${ASA_CONTACT.email}`}
          title="Email"
          subtitle={ASA_CONTACT.email}
          leading={<Mail className={iconClass} aria-hidden="true" />}
        />
        <ListRow
          href={ASA_CONTACT.phoneHref}
          title="Phone"
          subtitle={<span className="tabular">{ASA_CONTACT.phone}</span>}
          leading={<Phone className={iconClass} aria-hidden="true" />}
        />
        <ListRow
          title="Address"
          subtitle={
            <address className="not-italic">
              {ASA_CONTACT.addressLines[0]}
              <br />
              {ASA_CONTACT.addressLines[1]}
            </address>
          }
          leading={<MapPin className={iconClass} aria-hidden="true" />}
        />
        <ListRow
          href={ASA_CONTACT.website}
          external
          title="Website"
          subtitle="augie.edu/augustana-student-association"
          leading={<Globe className={iconClass} aria-hidden="true" />}
          accessory={<ArrowUpRight className="size-[18px] shrink-0 text-ink-3" aria-hidden="true" />}
        />
      </GroupedList>
    </div>
  );
}

export function ContactPage() {
  usePageTitle("Contact");
  const { user } = useAuth();
  const initial: ContactMessageInput = {
    name: user ? fullName(user) : "",
    email: user?.email ?? "",
    subject: "",
    message: "",
  };
  const [values, setValues] = useState<ContactMessageInput>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update<K extends keyof ContactMessageInput>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateContact(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    setStatus("sending");
    setSubmitError(null);
    try {
      await sendContactMessage({
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
      });
      setStatus("sent");
      setValues({ ...initial, subject: "", message: "" });
    } catch (err) {
      setStatus("error");
      setSubmitError(getErrorMessage(err));
    }
  }

  return (
    <Container>
      <PageHeader
        title="Contact ASA"
        description="Questions about an election, your eligibility, or the platform? Send the Augustana Student Association a message."
      />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-12">
        <ContactInfo />
        <Panel as="section" padding="lg" aria-labelledby="message-heading">
          <h2 id="message-heading" className="text-title-2">
            Send a message
          </h2>
          <p className="mt-1.5 text-callout text-ink-2">We usually reply within a few school days.</p>

          {status === "sent" && (
            <Alert tone="success" title="Message sent" className="mt-6">
              Thanks for reaching out — ASA will get back to you by email.
            </Alert>
          )}
          {status === "error" && submitError && (
            <Alert tone="error" title="Your message wasn't sent" className="mt-6">
              {submitError}
            </Alert>
          )}

          <form noValidate onSubmit={onSubmit} className="mt-8 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Input
                id="contact-name"
                label="Name"
                required
                autoComplete="name"
                maxLength={CONTACT_LIMITS.name}
                value={values.name}
                error={errors.name}
                onChange={(e) => update("name", e.target.value)}
              />
              <Input
                id="contact-email"
                label="Email"
                type="email"
                required
                autoComplete="email"
                maxLength={CONTACT_LIMITS.email}
                value={values.email}
                error={errors.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <Input
              id="contact-subject"
              label="Subject"
              required
              maxLength={CONTACT_LIMITS.subject}
              value={values.subject}
              error={errors.subject}
              onChange={(e) => update("subject", e.target.value)}
            />
            <Textarea
              id="contact-message"
              label="Message"
              required
              rows={6}
              maxLength={CONTACT_LIMITS.messageMax}
              value={values.message}
              error={errors.message}
              hint={`${values.message.trim().length} / ${CONTACT_LIMITS.messageMax} characters`}
              onChange={(e) => update("message", e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={status === "sending"} className="w-full sm:w-auto">
                Send message
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </Container>
  );
}
