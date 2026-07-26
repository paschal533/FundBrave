import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass } from "@/components/ui/icons";

export default function NotFound() {
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
          Page not found
        </h1>
        <p className="max-w-md text-text-secondary">
          The page you're looking for doesn't exist or has moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
