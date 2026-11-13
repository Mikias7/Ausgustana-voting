import { useState, type FormEvent } from "react";
import { ExternalLink, Mail, MapPin, Phone, Send } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { CONTACT_LIMITS, sendContactMessage, type ContactMessageInput } from "../api/contact";
import { ASA_CONTACT, BRAND } from "../components/layout/brand";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Container } from "../components/ui/Container";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
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

function ContactInfo() {
  const row = "flex items-start gap-3";
  const icon = "mt-0.5 size-5 shrink-0 text-augie-gold";
  return (
    <Card className="on-dark h-full border-augie-blue bg-augie-blue text-white">
      <img src={BRAND.logoLight} alt="" className="size-16" width={64} height={64} />
      <h2 className="mt-4 text-xl font-semibold text-white">{BRAND.orgName}</h2>
      <p className="mt-1 text-sm text-augie-blue-100">{BRAND.university}</p>
      <address className="mt-6 space-y-4 text-sm not-italic">
        <p className={row}>
          <Mail className={icon} aria-hidden="true" />
          <a href={`mailto:${ASA_CONTACT.email}`} className="text-white underline-offset-2 hover:underline">
            {ASA_CONTACT.email}
          </a>
        </p>
        <p className={row}>
          <Phone className={icon} aria-hidden="true" />
          <a href={ASA_CONTACT.phoneHref} className="text-white underline-offset-2 hover:underline">
            {ASA_CONTACT.phone}
          </a>
        </p>
        <p className={row}>
          <MapPin className={icon} aria-hidden="true" />
          <span>
            {ASA_CONTACT.addressLines[0]}
            <br />
            {ASA_CONTACT.addressLines[1]}
          </span>
        </p>
        <p className={row}>
          <ExternalLink className={icon} aria-hidden="true" />
          <a href={ASA_CONTACT.website} target="_blank" rel="noreferrer" className="text-white underline-offset-2 hover:underline">
            augie.edu/augustana-student-association<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </address>
    </Card>
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
    <Container className="py-10 sm:py-14">
      <PageHeader
        eyebrow="Get in touch"
        title="Contact ASA"
        description="Questions about an election, your eligibility, or the platform? Send the Augustana Student Association a message."
      />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <ContactInfo />
        <Card padding="lg">
          <h2 className="text-xl font-semibold">Send a message</h2>
          <p className="mt-1 text-sm text-slate-600">We usually reply within a few school days.</p>

          {status === "sent" && (
            <Alert tone="success" title="Message sent" className="mt-5">
              Thanks for reaching out — ASA will get back to you by email.
            </Alert>
          )}
          {status === "error" && submitError && (
            <Alert tone="error" title="Your message wasn't sent" className="mt-5">
              {submitError}
            </Alert>
          )}

          <form noValidate onSubmit={onSubmit} className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
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
              <Button type="submit" loading={status === "sending"} leftIcon={<Send className="size-4" aria-hidden="true" />}>
                Send message
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Container>
  );
}
