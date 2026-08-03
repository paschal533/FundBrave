"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { Menu, Plus, Search, X } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { BrandMark } from "@/components/layout/BrandMark";

const NAV_LINKS = [
  { label: "Campaigns", href: "/campaigns" },
  { label: "How it works", href: "/#why-fundbrave" },
  { label: "About", href: "/about" },
] as const;

/**
 * On the landing page ("/") the header overlays the dark hero per the
 * Figma "Onboarding" nav: transparent, solid-orange wordmark, white
 * links, orange sign-in pill. A top scrim gradient keeps the controls
 * legible over the photo. Everywhere else it keeps the standard sticky
 * translucent bar.
 *
 * Below sm the primary nav lives in a hamburger menu: an animated
 * dropdown panel anchored under the bar with full-width tap targets
 * and the auth actions. It closes on navigation, on Escape, and on
 * the backdrop. Desktop (sm:+) renders exactly as before.
 *
 * The search control is a real search: at sm:+ the icon toggles an
 * inline input that expands beside it and submits to
 * /campaigns?search=<query> (the listing page reads that param and
 * keeps it URL-synced). Below sm the same submit lives as the first
 * row of the hamburger panel.
 */
export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  const isHome = pathname === "/";

  // Past a small scroll threshold, the transparent hero header swaps to
  // the same solid bar every other page uses. Without this it stayed
  // transparent for the entire page (it has to stay `fixed` to remain
  // reachable while scrolling — see the position comment below), which
  // read as "barely visible" over the light Discover Causes / orange
  // band sections beneath the hero.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  // Drives every color/background choice below. isHome alone still
  // governs pure sizing (h-20 vs h-16, the bigger BrandMark) — only the
  // "transparent over a dark photo" look needs to give way once scrolled.
  const transparentVariant = isHome && !scrolled;

  // Navigating anywhere closes the menu and resets search.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
  }, [pathname]);

  // Expanding the inline search moves focus into it.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Escape closes the menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const closeSearch = (returnFocus = false) => {
    setSearchOpen(false);
    setSearchQuery("");
    if (returnFocus) searchButtonRef.current?.focus();
  };

  // Empty query just collapses; otherwise hand off to the listing page.
  const runSearch = () => {
    const query = searchQuery.trim();
    if (query) router.push(`/campaigns?search=${encodeURIComponent(query)}`);
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    runSearch();
    // Collapse and park focus on the icon rather than on a 0-width field.
    closeSearch(true);
  };

  const handleMobileSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    runSearch();
    setSearchQuery("");
    setMenuOpen(false);
  };

  const handleSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeSearch(true);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setMenuOpen(false);
      router.push("/");
    } finally {
      setLoggingOut(false);
    }
  };

  const desktopLinkClass = cn(
    "rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
    transparentVariant
      ? "text-white/90 hover:text-white"
      : "text-text-secondary hover:text-foreground"
  );

  const mobileLinkClass = cn(
    "rounded-md px-2 py-3 text-base font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
    transparentVariant
      ? "text-white/90 hover:bg-white/10 hover:text-white"
      : "text-foreground hover:bg-surface-overlay"
  );

  const searchTextClass = transparentVariant
    ? "text-white placeholder:text-white/60"
    : "text-foreground placeholder:text-text-tertiary";

  return (
    <header
      className={cn(
        "z-40 transition-colors duration-300",
        isHome
          ? // fixed, not absolute: absolute scrolls with the document, so
            // past the hero this header (carrying primary nav, search,
            // and auth/dashboard links) would scroll off-screen entirely
            // and stay inaccessible until the user scrolled back to the
            // very top. Background swaps from the transparent hero scrim
            // to the standard solid bar once scrolled — see `scrolled`.
            cn(
              "fixed inset-x-0 top-0",
              transparentVariant
                ? "bg-gradient-to-b from-black/70 via-black/35 to-transparent"
                : "border-b border-white/10 bg-background/80 backdrop-blur-md"
            )
          : "sticky top-0 border-b border-white/10 bg-background/80 backdrop-blur-md"
      )}
    >
      <div
        className={cn(
          "relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6",
          isHome ? "h-20" : "h-16"
        )}
      >
        {/* Left: logo + primary nav (desktop) */}
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            aria-label="FundBrave home"
          >
            <BrandMark size={isHome ? 26 : 22} />
            <span
              className={cn(
                "font-display text-lg font-bold tracking-tight sm:text-xl",
                transparentVariant
                  ? "text-[var(--fb-orange)]"
                  : "bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-primary-600)_100%)] bg-clip-text text-transparent"
              )}
            >
              FundBrave
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-4 sm:flex sm:gap-6"
          >
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={href} href={href} className={desktopLinkClass}>
                {label}
              </Link>
            ))}
            {status === "authenticated" && user?.role === "ADMIN" && (
              <Link href="/admin" className={desktopLinkClass}>
                Admin
              </Link>
            )}
          </nav>
        </div>

        {/* Right: search + auth state (Figma nav: search / Sign In / Get Started) */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {/* Inline expanding search (sm:+). The icon is the anchor; the
              field grows beside it on a width/opacity transition and
              submits to the campaigns listing's ?search= param. */}
          <form
            role="search"
            onSubmit={handleSearchSubmit}
            className={cn(
              "hidden items-center rounded-full border transition-colors duration-200 ease-out sm:flex",
              searchOpen
                ? transparentVariant
                  ? "border-white/25 bg-white/10"
                  : "border-border-default bg-surface-elevated"
                : "border-transparent"
            )}
          >
            <button
              ref={searchButtonRef}
              type="button"
              // Keep focus in the field so blur-to-collapse cannot race
              // this click and immediately re-open the input.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (searchOpen) closeSearch(true);
                else setSearchOpen(true);
              }}
              aria-expanded={searchOpen}
              aria-controls="header-search"
              aria-label={searchOpen ? "Close search" : "Search campaigns"}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                transparentVariant
                  ? "text-white/90 hover:bg-white/10 hover:text-white"
                  : "text-text-secondary hover:bg-surface-overlay hover:text-foreground"
              )}
            >
              <Search size={18} aria-hidden="true" />
            </button>
            <input
              id="header-search"
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onBlur={() => {
                if (!searchQuery.trim()) setSearchOpen(false);
              }}
              placeholder="Search campaigns..."
              aria-label="Search campaigns"
              enterKeyHint="search"
              tabIndex={searchOpen ? 0 : -1}
              className={cn(
                "h-9 min-w-0 bg-transparent text-sm outline-none transition-[width,opacity,padding] duration-200 ease-out",
                searchTextClass,
                searchOpen
                  ? "w-[180px] pr-4 opacity-100 lg:w-[240px]"
                  : "w-0 pr-0 opacity-0"
              )}
            />
          </form>
          {status === "loading" ? (
            <Spinner size="sm" color="primary" />
          ) : status === "authenticated" && user ? (
            <>
              <Button
                asChild
                variant={transparentVariant ? "ghost" : "secondary"}
                size="sm"
                className={cn(
                  "hidden sm:inline-flex",
                  transparentVariant &&
                    "text-white/90 hover:bg-white/10 hover:text-white"
                )}
              >
                <Link href="/campaigns/create" aria-label="Start a campaign">
                  <Plus size={16} aria-hidden="true" />
                  Start a campaign
                </Link>
              </Button>
              <Link
                href="/dashboard"
                className={cn(
                  "flex min-w-0 items-center gap-2 rounded-full border py-1 pl-1 pr-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:pr-3",
                  transparentVariant
                    ? "border-white/25 hover:bg-white/10"
                    : "border-white/10 hover:bg-surface-overlay"
                )}
                aria-label="Open your dashboard"
              >
                <Avatar
                  src={user.avatarUrl ?? undefined}
                  alt={user.displayName || user.username || user.email}
                  size="sm"
                />
                <span
                  className={cn(
                    "hidden max-w-[140px] truncate text-sm sm:inline",
                    transparentVariant ? "text-white" : "text-foreground"
                  )}
                >
                  {user.username ? `@${user.username}` : user.email}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                loading={loggingOut}
                loadingText="..."
                className={cn(
                  "hidden sm:inline-flex",
                  transparentVariant &&
                    "text-white/90 hover:bg-white/10 hover:text-white"
                )}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={cn(
                  "hidden rounded-md px-1 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:inline",
                  transparentVariant
                    ? "text-white/90 hover:text-white"
                    : "text-text-secondary hover:text-foreground"
                )}
              >
                Sign In
              </Link>
              <Button
                asChild
                size="sm"
                className="px-3 bg-[var(--fb-orange)] text-[#fafaf9] hover:bg-[#e0560f] active:bg-[#c94d0d] sm:px-[18px] dark:bg-[var(--fb-orange)] dark:text-[#fafaf9] dark:hover:bg-[#e0560f] dark:active:bg-[#c94d0d]"
              >
                <Link href="/auth/login">Get Started</Link>
              </Button>
            </>
          )}

          {/* Hamburger (phones only) */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className={cn(
              "flex size-10 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:hidden",
              transparentVariant
                ? "text-white hover:bg-white/10"
                : "text-foreground hover:bg-surface-overlay"
            )}
          >
            {menuOpen ? (
              <X size={22} aria-hidden="true" />
            ) : (
              <Menu size={22} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Backdrop: click-away close, fades with the panel. */}
      <div
        aria-hidden="true"
        onClick={() => setMenuOpen(false)}
        className={cn(
          "fixed inset-0 bg-black/40 transition-opacity duration-200 ease-out sm:hidden",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Mobile menu panel: anchored under the bar, slides down 8px and
          fades. CSS transition (not keyframes) so rapid toggling stays
          smooth; solid surface in both header variants so it reads over
          any page content. */}
      <div
        id="mobile-menu"
        className={cn(
          "absolute inset-x-0 top-full border-b shadow-xl transition-[opacity,transform] duration-200 ease-out sm:hidden",
          transparentVariant
            ? "border-white/10 bg-[#171717]"
            : "border-border-default bg-background",
          menuOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <nav aria-label="Mobile" className="flex flex-col px-4 py-4">
          {/* Phones get the same search, full width, above the links. */}
          <form
            role="search"
            onSubmit={handleMobileSearchSubmit}
            className={cn(
              "mb-3 flex h-11 items-center gap-2.5 rounded-full border px-4",
              transparentVariant
                ? "border-white/25 bg-white/10"
                : "border-border-default bg-surface-elevated"
            )}
          >
            <Search
              size={18}
              className={cn(
                "shrink-0",
                transparentVariant ? "text-white/70" : "text-text-tertiary"
              )}
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              aria-label="Search campaigns"
              enterKeyHint="search"
              className={cn(
                "h-full w-full min-w-0 bg-transparent text-base outline-none",
                searchTextClass
              )}
            />
          </form>

          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={mobileLinkClass}
            >
              {label}
            </Link>
          ))}
          {status === "authenticated" && user?.role === "ADMIN" && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className={mobileLinkClass}
            >
              Admin
            </Link>
          )}

          <div
            className={cn(
              "my-3 border-t",
              transparentVariant ? "border-white/10" : "border-border-default"
            )}
          />

          {status === "authenticated" && user ? (
            <div className="flex flex-col gap-1">
              <Button
                asChild
                fullWidth
                className="mb-2 bg-[var(--fb-orange)] text-[#fafaf9] hover:bg-[#e0560f] active:bg-[#c94d0d] dark:bg-[var(--fb-orange)] dark:text-[#fafaf9] dark:hover:bg-[#e0560f] dark:active:bg-[#c94d0d]"
              >
                <Link
                  href="/campaigns/create"
                  onClick={() => setMenuOpen(false)}
                >
                  Start a Campaign
                </Link>
              </Button>
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className={mobileLinkClass}
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className={cn(mobileLinkClass, "text-left")}
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Button
                asChild
                fullWidth
                className="mb-2 bg-[var(--fb-orange)] text-[#fafaf9] hover:bg-[#e0560f] active:bg-[#c94d0d] dark:bg-[var(--fb-orange)] dark:text-[#fafaf9] dark:hover:bg-[#e0560f] dark:active:bg-[#c94d0d]"
              >
                <Link href="/auth/login" onClick={() => setMenuOpen(false)}>
                  Get Started
                </Link>
              </Button>
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className={cn(mobileLinkClass, "text-center")}
              >
                Sign In
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
