import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — Treaty-Lab" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="px-4 md:px-6 py-16 max-w-md mx-auto">
      <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-2">
        ACCESS · TREATY-LAB
      </div>
      <h1 className="text-2xl font-semibold tracking-tight leading-tight">Sign in</h1>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
        Enter your email and we&apos;ll send a single-use sign-in link. No password.
      </p>
      <LoginForm next={next} initialError={error} />
    </div>
  );
}
