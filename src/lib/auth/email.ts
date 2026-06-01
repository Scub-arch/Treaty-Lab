/**
 * Pluggable email delivery for SEC-001 magic links.
 *
 * Dev/default sender logs the sign-in URL to the server console (zero infra,
 * works in CI). When production email env is present (RESEND_API_KEY +
 * EMAIL_FROM), `getEmailSender()` returns a Resend HTTP sender instead — no SDK
 * dependency, just `fetch`. Call sites are unchanged.
 *
 * Zero-cost discipline: with no provider env set, nothing is sent and no
 * external service is contacted — dev and CI keep the console sender.
 */

export interface MagicLinkEmail {
  to: string;
  url: string;
}

export interface EmailSender {
  sendMagicLink(msg: MagicLinkEmail): Promise<void>;
}

const consoleSender: EmailSender = {
  async sendMagicLink({ to, url }) {
    console.log(
      `\n──────── Treaty-Lab sign-in link ────────\n  to:  ${to}\n  url: ${url}\n─────────────────────────────────────────\n`,
    );
  },
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Build the Resend request payload for a magic-link email. Pure (no I/O) so it
 * is unit-testable. `from` must be a Resend-verified sender, e.g.
 * "Treaty-Lab <no-reply@your-domain>".
 */
export function buildMagicLinkPayload(from: string, { to, url }: MagicLinkEmail) {
  return {
    from,
    to,
    subject: "Your Treaty-Lab sign-in link",
    text: [
      "Sign in to Treaty-Lab using the link below:",
      "",
      url,
      "",
      "This link is single-use and expires shortly.",
      "If you did not request it, you can safely ignore this email.",
    ].join("\n"),
    html: magicLinkHtml(url),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function magicLinkHtml(url: string): string {
  const safe = escapeHtml(url);
  // Inline styles, image-free — safe and consistent across email clients.
  return [
    `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">`,
    `<p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#666;margin:0 0 16px">Treaty-Lab</p>`,
    `<h1 style="font-size:18px;margin:0 0 12px">Your sign-in link</h1>`,
    `<p style="font-size:14px;line-height:1.6;margin:0 0 20px">Use the button below to sign in. This link is single-use and expires shortly.</p>`,
    `<p style="margin:0 0 24px"><a href="${safe}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:14px;padding:10px 18px;border-radius:6px">Sign in to Treaty-Lab</a></p>`,
    `<p style="font-size:12px;line-height:1.6;color:#666;margin:0">If the button does not work, paste this URL into your browser:<br><span style="word-break:break-all">${safe}</span></p>`,
    `<p style="font-size:12px;color:#999;margin:20px 0 0">If you did not request this, you can ignore this email.</p>`,
    `</div>`,
  ].join("");
}

function resendSender(apiKey: string, from: string): EmailSender {
  return {
    async sendMagicLink(msg) {
      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildMagicLinkPayload(from, msg)),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Resend send failed: HTTP ${res.status} ${detail.slice(0, 300)}`);
      }
    },
  };
}

/** True when production email delivery is configured (Resend API key + from address). */
export function isProdEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function getEmailSender(): EmailSender {
  if (isProdEmailConfigured()) {
    return resendSender(process.env.RESEND_API_KEY as string, process.env.EMAIL_FROM as string);
  }
  return consoleSender;
}

/** Whether magic-link URLs may be surfaced in API responses (dev convenience). */
export function exposeMagicLinkInResponse(): boolean {
  return process.env.NODE_ENV !== "production";
}
