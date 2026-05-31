"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-or-expired": "That sign-in link was invalid or has expired. Request a new one below.",
};

type State = "idle" | "sending" | "sent" | "error";

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>(initialError ? "error" : "idle");
  const [message, setMessage] = useState<string | null>(
    initialError ? (ERROR_MESSAGES[initialError] ?? "Something went wrong.") : null,
  );
  const [devUrl, setDevUrl] = useState<string | null>(null);

  const busy = state === "sending" || state === "sent";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setMessage(null);
    setDevUrl(null);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, next }),
      });
      const data = (await res.json()) as { message?: string; error?: string; devUrl?: string };
      if (res.ok) {
        setState("sent");
        setMessage(data.message ?? "Check your email for a sign-in link.");
        setDevUrl(data.devUrl ?? null);
      } else {
        setState("error");
        setMessage(data.error ?? "Something went wrong.");
      }
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <Input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
        autoComplete="email"
        aria-label="Email address"
      />
      <Button type="submit" disabled={busy || !email} className="w-full">
        {state === "sending" ? "Sending…" : state === "sent" ? "Link sent" : "Send sign-in link"}
      </Button>

      {message && (
        <p
          className={`text-sm ${state === "error" ? "text-destructive" : "text-muted-foreground"}`}
          role={state === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      )}

      {devUrl && (
        <div className="mt-2 rounded-md border border-border bg-muted/40 p-3">
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground mb-1">
            DEV MAGIC LINK
          </div>
          <a href={devUrl} className="text-xs break-all text-primary underline">
            {devUrl}
          </a>
        </div>
      )}
    </form>
  );
}
