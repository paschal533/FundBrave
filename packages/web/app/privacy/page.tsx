import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How FundBrave collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
};

/**
 * MVP privacy policy — written to match what the platform actually
 * does today (Privy email auth, embedded wallets, on-chain donations,
 * campaign media uploads). Update alongside any data-handling change.
 */
export default function PrivacyPolicyPage() {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"
    >
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Last updated: August 2, 2026
      </p>

      <div className="mt-10 flex flex-col gap-8 text-base leading-relaxed text-text-secondary">
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            What we collect
          </h2>
          <p>
            When you sign in, our authentication provider (Privy) verifies
            your email address and provisions an embedded wallet for you. We
            store your email, the public address of that wallet, and the
            profile details you choose to add (display name, username,
            avatar).
          </p>
          <p>
            When you create a campaign, we store the campaign content you
            publish: the title, story, goal, and any images or video you upload.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            What lives on public blockchains
          </h2>
          <p>
            Donations are on-chain transactions to a campaign&rsquo;s vault
            address. Like all blockchain activity, they are publicly visible
            and permanent: wallet addresses, amounts, and timestamps can be
            seen by anyone. FundBrave indexes this public data to show
            campaign progress; we do not control and cannot delete it.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            How we use your information
          </h2>
          <p>
            To operate the platform: showing campaigns, verifying and
            displaying donations, processing withdrawals, sending
            transactional emails (such as donation and withdrawal
            notifications), and keeping the platform safe. We do not sell
            your personal information.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            Who we share it with
          </h2>
          <p>
            Only the service providers that make the platform work:
            authentication (Privy), file storage, email delivery, and
            blockchain infrastructure. Each receives only what it needs to
            provide its service.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            Your choices
          </h2>
          <p>
            You can update your profile details from your dashboard. To ask
            about or request deletion of your account data, contact us at{" "}
            <a
              href="mailto:support@fundbrave.com"
              className="text-primary underline underline-offset-4"
            >
              support@fundbrave.com
            </a>
            . Note that on-chain records cannot be altered or deleted by
            anyone, including us.
          </p>
        </section>
      </div>
    </main>
  );
}
