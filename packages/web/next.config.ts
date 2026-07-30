import type { NextConfig } from "next";

// Third-party origins this app actually loads scripts/frames/sockets from
// or connects to: Privy (auth + embedded wallets), Reown/WalletConnect
// (external wallet connect modal + relay), and the RPC providers configured
// for donation chains. 'unsafe-inline'/'unsafe-eval' on script-src are a
// real weakening (a proper nonce-based CSP needs middleware to generate a
// per-request nonce) — kept here as a pragmatic starting policy for a stack
// with several third-party wallet SDKs, not a final answer. Test real
// Privy login + WalletConnect flows against this before relying on it in
// production; loosen only what's actually needed if something breaks.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://*.privy.io",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: http://localhost:*",
  "font-src 'self' data:",
  "connect-src 'self' https://*.privy.io wss://*.privy.io https://*.walletconnect.com wss://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.org https://*.reown.com wss://*.reown.com https://*.web3modal.org https://*.g.alchemy.com https://*.publicnode.com https://sepolia.base.org https://mainnet.base.org https://polygon-rpc.com https://arb1.arbitrum.io https://eth.llamarpc.com http://localhost:4000",
  "frame-src 'self' https://auth.privy.io https://*.privy.io https://verify.walletconnect.com https://verify.walletconnect.org",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      // Dev local-disk uploads served by the API
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // @coinbase/cdp-sdk (pulled transitively by RainbowKit's Base Account
  // connector) references optional @x402/* payment packages we don't use.
  // Ignore them so the bundler doesn't fail resolving optional deps.
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }),
    );
    return config;
  },
};

export default nextConfig;
