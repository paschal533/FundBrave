import Link from "next/link";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
  /** Items with no real destination page yet — rendered as plain text, never a fake link. */
  plainText?: string[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Navigation",
    links: [
      { label: "Home", href: "/" },
      { label: "Browse campaigns", href: "/campaigns" },
      { label: "Start a campaign", href: "/campaigns/create" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", href: "/auth/login" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Request access", href: "/request-access" },
    ],
  },
  {
    heading: "Legal",
    links: [],
    plainText: ["Privacy Policy", "Terms of Service"],
  },
];

/**
 * Fixed-dark treatment regardless of the site's light/dark toggle —
 * same pattern as the landing page's hero and closing-CTA sections.
 * Uses the app's own dark-mode --background value directly so the
 * footer's dark tone matches what dark-mode users already see
 * elsewhere, rather than an unrelated black.
 */
export function Footer() {
  return (
    <footer className="mt-16 bg-[oklch(0.145_0.02_60)] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-2 gap-8 sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="bg-[image:var(--gradient-brand-fixed)] bg-clip-text text-transparent">
              FundBrave
            </span>
          </span>
          <p className="max-w-[220px] text-sm text-white/70">
            Borderless fundraising, powered by crypto and owned by
            communities.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-white">
              {column.heading}
            </h3>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {column.plainText?.map((text) => (
                <li key={text} className="text-sm text-white/40">
                  {text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 w-full max-w-[1400px] border-t border-white/10 pt-6 text-xs text-white/50">
        © {new Date().getFullYear()} FundBrave. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
