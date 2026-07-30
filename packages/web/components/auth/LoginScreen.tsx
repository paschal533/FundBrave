"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/BrandMark";

export function LoginScreen() {
  const router = useRouter();
  const { status, needsOnboarding, privyReady, login, refetch } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(needsOnboarding ? "/onboarding" : "/dashboard");
    } else if (status === "not_whitelisted") {
      router.replace("/request-access");
    }
  }, [status, needsOnboarding, router]);

  // Privy authed + backend sync in flight (or redirect pending).
  const syncing = privyReady && status === "loading";

  return (
    <main
      id="main-content"
      className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4 text-center"
    >
      {/* FundBrave mark */}
      <BrandMark size={48} />
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
        <span className="bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-primary-600)_100%)] bg-clip-text text-transparent">
          FundBrave
        </span>
      </h1>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Sign in to continue
        </h2>
        <p className="mx-auto max-w-sm text-text-secondary">
          Invite-only beta. Sign in with your email and we create a wallet
          for you automatically.
        </p>
      </div>

      <Button
        size="lg"
        onClick={login}
        disabled={!privyReady}
        loading={syncing}
        loadingText="Signing you in..."
        className="w-full max-w-xs"
      >
        Sign in
      </Button>

      {status === "error" ? (
        <p className="max-w-sm text-sm text-destructive" role="alert">
          We could not sync your account.{" "}
          <button
            type="button"
            onClick={() => refetch()}
            className="cursor-pointer underline underline-offset-2 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            Try again
          </button>
        </p>
      ) : (
        <p className="text-sm text-text-tertiary">
          Access is granted by the FundBrave team during the beta.
        </p>
      )}
    </main>
  );
}

export default LoginScreen;
