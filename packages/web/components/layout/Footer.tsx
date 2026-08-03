import Link from "next/link";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  heading: string;
  items: FooterLink[];
}

/**
 * Figma "Onboarding" footer (node 572:399 / 580:4): four uppercase
 * columns, hairline divider, then orange wordmark / copyright /
 * circular social icons. Every row is a real destination: local pages
 * where they exist (/privacy, /terms), the landing page's features
 * band for the "what we do" rows, and www.fundbrave.com for company
 * info that has no local page yet. The design's placeholder phone
 * number was dropped on purpose — slot a real one into TALK TO US
 * when there is one.
 */
const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Navigation",
    items: [
      { label: "Home", href: "/" },
      { label: "About Us", href: "/about" },
      { label: "What We Do", href: "/#why-fundbrave" },
      { label: "Create Campaign", href: "/campaigns/create" },
      { label: "Donate", href: "/campaigns" },
    ],
  },
  {
    heading: "What We Do",
    items: [
      { label: "Encouraging giving", href: "/campaigns" },
      { label: "Strengthening Advocacy", href: "/#why-fundbrave" },
      { label: "Sharing Information", href: "/#why-fundbrave" },
      { label: "Building Leadership", href: "/#why-fundbrave" },
      { label: "Engaging With Global Fund", href: "/#why-fundbrave" },
      { label: "Shining a Light", href: "/#why-fundbrave" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "General Info", href: "/about" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
  {
    heading: "Talk To Us",
    items: [
      { label: "support@fundbrave.com", href: "mailto:support@fundbrave.com" },
      { label: "Contact Us", href: "mailto:hello@fundbrave.com" },
      { label: "GitHub", href: "https://github.com/fundbrave" },
      { label: "Linkedin", href: "https://linkedin.com/company/fundbrave" },
      { label: "Twitter", href: "https://twitter.com/fundbrave" },
    ],
  },
];

/* Exact Figma exports (white fills). Twitter/Facebook ship their own
   circle outline; the LinkedIn export is a bare 14px glyph, so it gets
   the circle drawn by its wrapper. Twitter and LinkedIn point at the
   real FundBrave profiles; there is no Facebook profile yet, so that
   icon stays decorative until one exists. */
function SocialIcons() {
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable @next/next/no-img-element -- exact Figma SVG exports */}
      <a
        href="https://twitter.com/fundbrave"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="FundBrave on Twitter"
        className="rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        <img src="/landing/icons/social-twitter.svg" alt="" className="size-10" />
      </a>
      <a
        href="https://linkedin.com/company/fundbrave"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="FundBrave on LinkedIn"
        className="flex size-10 items-center justify-center rounded-full border border-white/25 transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        <img src="/landing/icons/social-linkedin.svg" alt="" className="size-3.5" />
      </a>
      <img
        src="/landing/icons/social-facebook.svg"
        alt=""
        aria-hidden="true"
        className="size-10"
      />
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#151515] px-4 py-14 text-white sm:px-6">
      {/* The four Figma columns only have room for their longest labels
          ("Engaging With Global Fund", "support@fundbrave.com") from about
          860px up — below that they wrapped and the address broke mid-word.
          Tablets and large phones therefore keep the 2-up grid. */}
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading} className="flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-white">
              {column.heading}
            </h3>
            <ul className="flex flex-col gap-1 sm:gap-0">
              {column.items.map((item) =>
                item.href.startsWith("/") ? (
                  <li key={item.label} className="leading-snug sm:leading-[30px]">
                    <Link
                      href={item.href}
                      className="inline-block break-words py-2 text-sm text-white/80 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:inline sm:py-0"
                    >
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li key={item.label} className="leading-snug sm:leading-[30px]">
                    <a
                      href={item.href}
                      {...(item.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="inline-block break-words py-2 text-sm text-white/80 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:inline sm:py-0"
                    >
                      {item.label}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 w-full max-w-[1200px] border-t border-white/10 pt-8">
        {/* Stays stacked until md: on a 480–767 row the copyright was
            crushed to ~90px and wrapped onto four lines. */}
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <Link
            href="/"
            className="rounded-md font-display text-2xl font-extrabold tracking-tight text-[var(--fb-orange)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:text-3xl"
            aria-label="FundBrave home"
          >
            FundBrave
          </Link>
          <p className="text-xs text-white/70 sm:text-sm">
            © {new Date().getFullYear()} FundBrave. All Rights Reserved.
          </p>
          <SocialIcons />
        </div>
      </div>
    </footer>
  );
}

export default Footer;
