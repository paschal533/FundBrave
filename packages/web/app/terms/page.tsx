import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of FundBrave.",
  alternates: { canonical: "/terms" },
};

/**
 * MVP terms of service — reflects how the platform actually works
 * (non-custodial campaign vaults, 2-of-2 withdrawals). Update
 * alongside any product change that affects these commitments.
 */
export default function TermsOfServicePage() {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"
    >
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Last updated: August 2, 2026
      </p>

      <div className="mt-10 flex flex-col gap-8 text-base leading-relaxed text-text-secondary">
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            What FundBrave is
          </h2>
          <p>
            FundBrave is a platform for creating fundraising campaigns and
            donating to them with cryptocurrency. Each campaign gets its own
            on-chain vault (a smart-contract account). Donations go directly
            from donors to that vault. FundBrave never takes custody of
            donated funds.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            Withdrawals
          </h2>
          <p>
            Withdrawing from a campaign vault requires two signatures: the
            campaign creator&rsquo;s and the platform&rsquo;s. This is
            enforced by the vault contract itself. The platform&rsquo;s
            co-signature exists to deter fraud and misuse; it does not give
            FundBrave the ability to move funds on its own.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            Your responsibilities
          </h2>
          <p>
            Campaign creators must describe their cause truthfully and use
            funds for the stated purpose. Donors should evaluate campaigns
            before giving. Blockchain transactions are irreversible, and a
            donation cannot be recalled once sent. You are responsible for
            the security of your own login and for complying with the laws
            that apply to you, including any tax obligations.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            Platform rights
          </h2>
          <p>
            We may suspend campaigns or accounts that we reasonably believe
            are fraudulent, unlawful, or in breach of these terms.
            Suspension pauses a campaign&rsquo;s visibility and the
            platform&rsquo;s co-signature; it does not seize funds.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            No warranty
          </h2>
          <p>
            FundBrave is provided &ldquo;as is&rdquo;, during an early
            (MVP) phase. We work hard to keep the platform reliable and
            secure, but we cannot guarantee uninterrupted service and are
            not liable for losses arising from blockchain networks, wallet
            providers, or campaigns themselves.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a
              href="mailto:support@fundbrave.com"
              className="text-primary underline underline-offset-4"
            >
              support@fundbrave.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
