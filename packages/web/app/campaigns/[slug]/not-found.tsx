import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass } from "@/components/ui/icons";

export default function CampaignNotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4 text-center"
    >
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-600)] dark:bg-[color-mix(in_srgb,var(--color-primary-900)_50%,transparent)] dark:text-[var(--color-primary-200)]"
      >
        <Compass size={30} />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Campaign not found
        </h1>
        <p className="max-w-md text-text-secondary">
          This campaign may have been unpublished, or the link is incorrect.
        </p>
      </div>
      <Button asChild>
        <Link href="/campaigns">Browse campaigns</Link>
      </Button>
    </main>
  );
}
