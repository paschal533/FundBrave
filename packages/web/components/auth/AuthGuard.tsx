"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";

interface AuthGuardProps {
  children: ReactNode;
  /** When true, users without a username are redirected to /onboarding. */
  requireOnboarded?: boolean;
}

/** How long the guard waits in the loading state before offering a manual retry. */
const LOADING_TIMEOUT_MS = 12_000;

/**
 * Client-side guard for authed pages.
 *
 * - unauthenticated  → /auth/login
 * - not_whitelisted  → /request-access
 * - needsOnboarding  → /onboarding (only when requireOnboarded)
 * - error            → inline retry state
 * - stuck loading    → inline retry state after LOADING_TIMEOUT_MS (Privy init
 *   can hang under some viewport/network conditions — never spin forever)
 */
export function AuthGuard({
  children,
  requireOnboarded = false,
}: AuthGuardProps) {
  const router = useRouter();
  const { status, needsOnboarding, refetch } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
    } else if (status === "not_whitelisted") {
      router.replace("/request-access");
    } else if (
      status === "authenticated" &&
      requireOnboarded &&
      needsOnboarding
    ) {
      router.replace("/onboarding");
    }
  }, [status, needsOnboarding, requireOnboarded, router]);

  const isLoading =
    status !== "authenticated" && status !== "error"
      ? status === "unauthenticated" || status === "not_whitelisted"
        ? false // a redirect is already in flight, don't show the timeout UI
        : true
      : requireOnboarded && needsOnboarding;

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (status === "error" || (isLoading && timedOut)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="max-w-sm text-text-secondary">
          {status === "error"
            ? "We could not load your account. The API may be unavailable or still starting up."
            : "This is taking longer than expected to load."}
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-label="Loading your account"
      >
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGuard;
