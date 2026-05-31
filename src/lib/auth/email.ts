/**
 * Pluggable email delivery for SEC-001 magic links.
 *
 * Dev/default sender logs the sign-in URL to the server console (zero infra,
 * works in CI). A production sender (nodemailer/SMTP, Resend, etc.) can be
 * swapped in behind `getEmailSender()` without touching call sites — wire it to
 * the presence of SMTP/provider env vars when prod email is implemented.
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
    // eslint-disable-next-line no-console
    console.log(
      `\n──────── Treaty-Lab sign-in link ────────\n  to:  ${to}\n  url: ${url}\n─────────────────────────────────────────\n`,
    );
  },
};

export function getEmailSender(): EmailSender {
  // Future: if SMTP_* / RESEND_API_KEY env present, return a real sender here.
  return consoleSender;
}

/** Whether magic-link URLs may be surfaced in API responses (dev convenience). */
export function exposeMagicLinkInResponse(): boolean {
  return process.env.NODE_ENV !== "production";
}
