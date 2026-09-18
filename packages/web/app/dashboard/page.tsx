"use client";

/**
 * Dashboard container: auth, data and the modals the view can open.
 * The markup lives in DashboardView so it can be rendered with fixtures.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { SendFundsModal } from "@/components/wallet/SendFundsModal";

function DashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const { refetch, ...summary } = useDashboardSummary();

  if (!user) return null; // AuthGuard guarantees this never renders

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.push("/auth/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <DashboardView
        name={user.displayName || user.username || user.email}
        avatarUrl={user.avatarUrl ?? undefined}
        walletAddress={user.walletAddress ?? null}
        isAdmin={user.role === "ADMIN"}
        summary={summary}
        loggingOut={loggingOut}
        onLogout={handleLogout}
        onSend={() => setSendOpen(true)}
        onRetry={refetch}
        onStartCampaign={() => router.push("/campaigns/create")}
      />
      <SendFundsModal open={sendOpen} onClose={() => setSendOpen(false)} />
    </>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard requireOnboarded>
      <DashboardContent />
    </AuthGuard>
  );
}
