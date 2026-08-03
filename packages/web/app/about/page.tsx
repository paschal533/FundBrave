import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "FundBrave is decentralized fundraising powered by blockchain and DeFi. Transparent, instant, and designed to maximize social impact.",
  alternates: { canonical: "/about" },
};

/* Copy is grounded in the live FundBrave sites' own language (the
   fundbrave.com mission statement and the platform copy from the Benin
   deployment). Keep it plain prose: no em dashes. */
const WHAT_WE_DO = [
  {
    title: "Zero platform fees",
    body: "100% of every donation reaches the cause. No platform fees, no hidden cuts.",
  },
  {
    title: "Full transparency",
    body: "Every transaction is logged on-chain, so you can see exactly how your donation is used.",
  },
  {
    title: "Non-custodial by design",
    body: "FundBrave never holds donated funds. Each campaign has its own smart contract vault, and withdrawals require two signatures: the creator's and the platform's.",
  },
  {
    title: "No seed phrases",
    body: "Creators sign up with an email address. A self-custodial wallet is created automatically, so crypto experience is never a barrier to raising funds.",
  },
  {
    title: "Instant global payments",
    body: "Donations settle in minutes across multiple blockchain networks, in native crypto or stablecoins.",
  },
  {
    title: "Multi-chain by default",
    body: "Every campaign vault has the same address on Base, Ethereum, Polygon, and Arbitrum, so donors can give from whichever network they already use.",
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Create a campaign",
    body: "Sign in with your email, tell your story, and set a goal. Your campaign gets its own on-chain vault address that is identical on every supported network.",
  },
  {
    step: "2",
    title: "Receive donations directly",
    body: "Donors send funds straight to your campaign's vault from any supported chain, either by connecting a wallet or by scanning a QR code. Every donation is verified against on-chain receipts.",
  },
  {
    step: "3",
    title: "Withdraw with two signatures",
    body: "When you withdraw, you sign and the platform co-signs. No single party can move donated funds alone, and that includes us.",
  },
] as const;

export default function AboutUsPage() {
  return (
    <main id="main-content" className="flex flex-col">
      {/* Intro */}
      <section className="mx-auto w-full max-w-3xl px-4 pt-16 pb-4 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          About FundBrave
        </h1>
        <div className="mt-6 flex flex-col gap-4 text-base leading-relaxed text-text-secondary sm:text-lg">
          <p>
            FundBrave is decentralized fundraising powered by blockchain and
            DeFi. Transparent, instant, and designed to maximize social
            impact.
          </p>
          <p>
            We believe giving should be borderless. A donor in one country
            should be able to support a classroom, a clinic, or a relief
            effort in another within minutes, and then verify exactly where
            every unit of value went. Traditional fundraising routes
            donations through custodial middlemen, takes fees at every hop,
            and offers little visibility at the end. FundBrave replaces that
            with campaign-owned smart contract vaults on public blockchains.
            Donations travel directly from the donor to the cause, and the
            record is public forever.
          </p>
        </div>
      </section>

      {/* What we do */}
      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          What we do
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {WHAT_WE_DO.map(({ title, body }) => (
            <div
              key={title}
              className="flex flex-col gap-2 rounded-xl border border-border-default bg-surface-elevated p-5"
            >
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          How it works
        </h2>
        {/* Three columns only from md: at 480 they were ~120px wide, so each
            step's paragraph broke into two-or-three-word lines. */}
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {HOW_IT_WORKS.map(({ step, title, body }) => (
            <div key={step} className="flex flex-col gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-[var(--fb-orange)] text-lg font-bold text-[#fafaf9]">
                {step}
              </span>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Ecosystem */}
      <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          The bigger picture
        </h2>
        <div className="mt-6 flex flex-col gap-4 text-base leading-relaxed text-text-secondary">
          <p>
            This platform is one part of a larger mission. At{" "}
            <a
              href="https://www.fundbrave.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              www.fundbrave.com
            </a>{" "}
            we are building the first platform where donations can generate
            DeFi yield for causes long after the first gift, so that giving
            becomes sustainable instead of one-off.
          </p>
          <p>
            Questions, partnerships, or press? Reach us at{" "}
            <a
              href="mailto:hello@fundbrave.com"
              className="text-primary underline underline-offset-4"
            >
              hello@fundbrave.com
            </a>
            .
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-start gap-6 px-4 pt-4 pb-20 sm:px-6">
        <h2 className="text-2xl font-semibold text-foreground">
          Ready to make a difference?
        </h2>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button
            asChild
            size="lg"
            className="bg-[var(--fb-orange)] text-[#fafaf9] hover:bg-[#e0560f] active:bg-[#c94d0d]"
          >
            <Link href="/campaigns">Explore Campaigns</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/login">Start a Campaign</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
