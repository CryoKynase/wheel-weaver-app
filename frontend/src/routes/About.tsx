import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import InlineAlert from "@/components/ui/InlineAlert";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

type ContactState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function About() {
  const currentYear = new Date().getFullYear();
  const copyright = useMemo(
    () =>
      `© 2024–${currentYear} WheelWeaver. All rights reserved.`,
    [currentYear]
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<ContactState>({ status: "idle" });

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (!isValidEmail(email)) return false;
    if (message.trim().length < 10) return false;
    return state.status !== "sending";
  }, [name, email, message, state.status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setState({ status: "error", message: "Please enter your name." });
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setState({
        status: "error",
        message: "Please enter a valid email address.",
      });
      return;
    }
    if (trimmedMessage.length < 10) {
      setState({
        status: "error",
        message:
          "Message is a bit short — can you add a little more detail?",
      });
      return;
    }

    try {
      setState({ status: "sending" });
      const response = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Request failed (${response.status})`);
      }

      setState({
        status: "success",
        message: "Thanks — message sent. I’ll get back to you when I can.",
      });
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error(err);
      setState({
        status: "error",
        message:
          "Sorry — something went wrong sending that. Please try again, or email me directly at hello@wheelweaver.com.",
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Got feedback, a bug report, or want to ask about
            permissions/licensing? Send me a message here.
          </p>

          {state.status === "success" && (
            <InlineAlert variant="success" title="Sent" className="mb-4">
              {state.message}
            </InlineAlert>
          )}

          {state.status === "error" && (
            <InlineAlert variant="error" title="Couldn’t send" className="mb-4">
              {state.message}
            </InlineAlert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Name</span>
              <Input
                id="contact-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Your name"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <Input
                id="contact-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                inputMode="email"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Message</span>
              <textarea
                id="contact-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your message…"
                rows={6}
                required
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters.
              </p>
            </label>

            <Button type="submit" disabled={!canSubmit}>
              {state.status === "sending" ? "Sending…" : "Send message"}
            </Button>

            <p className="text-xs text-muted-foreground">
              Prefer email? Just write to{" "}
              <span className="font-medium">hello@wheelweaver.com</span>.
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About WheelWeaver</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-base font-semibold">Copyright</h3>
            <p className="text-sm">{copyright}</p>
            <p className="text-sm text-muted-foreground">
              WheelWeaver, including its source code, lacing tables/diagrams,
              text, and branding, is protected by copyright. You may use the
              app for personal use (or internal workshop use). You may not
              copy, reproduce, modify, distribute, sell, scrape, or create
              derivative works from WheelWeaver (including diagrams/outputs)
              without written permission.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">Trade marks</h3>
            <p className="text-sm text-muted-foreground">
              WheelWeaver™ and the WheelWeaver logo are trade marks of the author.
              All other trade marks are the property of their respective owners.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">
              Disclaimer (safety-critical)
            </h3>
            <p className="text-sm text-muted-foreground">
              Wheel building is safety-critical. WheelWeaver provides guidance
              only and does not replace professional judgement, manufacturer
              specifications, or inspection/testing. Always verify spoke
              length, lacing, dish, tension balance, and final wheel safety
              before riding.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">
              Disclaimer (accuracy &amp; liability)
            </h3>
            <p className="text-sm text-muted-foreground">
              We aim to keep the information accurate and the app available,
              but we do not guarantee it will be error-free or suitable for
              every use case. Nothing in this disclaimer limits or excludes
              liability where it would be unlawful to do so, including for
              death or personal injury caused by negligence, or for fraud.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
