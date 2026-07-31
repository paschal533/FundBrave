/**
 * wagmi + RainbowKit configuration for wallet donations (phase 3).
 *
 * Degraded mode: when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing (or
 * still the .env.example placeholder starting with "your-"), `wagmiConfig`
 * is null. Providers skip WagmiProvider/RainbowKitProvider entirely and the
 * DonatePanel hides the "Pay with wallet" tab, leaving address/QR donations.
 *
 * NEXT_PUBLIC_ env vars are inlined at build time, so these are stable
 * constants for the lifetime of the app.
 */

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { arbitrum, base, mainnet, polygon } from "viem/chains";

const rawProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

/** WalletConnect Cloud project ID, or null when not configured. */
export const walletConnectProjectId: string | null =
  rawProjectId && !rawProjectId.startsWith("your-") ? rawProjectId : null;

/** Whether wallet payments (wagmi + RainbowKit) are available. */
export const isWalletConfigured: boolean = walletConnectProjectId !== null;

// Remove expired WalletConnect v2 pairings from localStorage before wagmi
// initializes. Without this, wagmi's auto-reconnect tries to restore dead
// relay subscriptions on load, causing an endless WebSocket retry loop
// ("Subscribing to ... failed, please try again").
if (typeof window !== "undefined") {
  try {
    const wcKeys = Object.keys(localStorage).filter((k) => k.startsWith("wc@2:"));
    const pairingKey = wcKeys.find((k) => k.includes("pairing"));
    if (pairingKey) {
      const pairings = JSON.parse(localStorage.getItem(pairingKey) ?? "{}") as Record<
        string,
        { expiry?: number }
      >;
      const now = Math.floor(Date.now() / 1000);
      const anyExpired = Object.values(pairings).some((p) => p.expiry && p.expiry < now);
      if (anyExpired) {
        wcKeys.forEach((k) => localStorage.removeItem(k));
      }
    }
  } catch {
    // Never crash the app over storage cleanup.
  }
}

// getDefaultConfig falls back to viem's bundled public RPC endpoints per
// chain when no transports are given. Those are unauthenticated, shared,
// rate-limited endpoints — useWaitForTransactionReceipt (the "Confirming
// on-chain..." step after a donation is sent) polls through them, and under
// load the poll can silently stall with no error, leaving the donate button
// spinning indefinitely even though the transaction already succeeded.
// Route through the same Alchemy key the API uses server-side (Alchemy
// keys are designed to be used client-side; protect via domain allowlisting
// in the Alchemy dashboard, not secrecy) whenever it's configured.
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const transports = alchemyKey
  ? {
      [base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`),
      [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`),
      [polygon.id]: http(`https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`),
      [arbitrum.id]: http(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`),
    }
  : undefined;

/**
 * The wagmi config — null in degraded mode. The chain list mirrors the
 * mainnet chains the production API has enabled (ENABLED_CHAIN_IDS);
 * donations go to the same Safe address on every supported chain.
 *
 * Deliberately mainnet-only, no testnets: a WalletConnect session proposal
 * lists every requested chain, and mobile/exchange wallets (observed with
 * Binance Wallet) commonly reject the whole session — not just the
 * unsupported chain — if any requested chain isn't in their own supported
 * list. Testnets like Base Sepolia are exactly the kind of chain those
 * wallets don't support, and this app is deployed to mainnet only, so they
 * serve no purpose here and only break real wallet connections.
 *
 * appUrl must be the real deployed domain, not omitted — WalletConnect's
 * relay reports whatever origin it resolves to, and that has to match a
 * domain registered on the project's allowlist at cloud.reown.com or every
 * connection attempt is rejected with "Origin not found on Allowlist".
 */
export const wagmiConfig = walletConnectProjectId
  ? getDefaultConfig({
      appName: "FundBrave",
      appDescription:
        "Decentralized fundraising with real Gnosis Safe multisig donation wallets.",
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://fundbrave.app",
      projectId: walletConnectProjectId,
      chains: [base, mainnet, polygon, arbitrum],
      transports,
      ssr: true,
    })
  : null;

/** Message shown when wallet payments are unavailable. */
export const WALLET_NOT_CONFIGURED_MESSAGE =
  "Wallet payments are unavailable: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. You can still donate by sending funds to the campaign address below.";
