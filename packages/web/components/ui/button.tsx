import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

/**
 * FundBrave Unified Button Component
 * 
 * Consolidated from DesignButton with Figma design mappings.
 * Variants: primary (gradient), secondary (glass), tertiary (ghost), destructive, outline
 * Sizes: sm (36h), md (48h), lg (56h), xl (60h), icon
 */

const buttonVariants = cva(
  // Base styles
  // transition lists explicit properties (not `all`) so layout props never
  // animate; opacity is deliberately NOT transitioned so JS animation
  // libraries (GSAP intro tweens) can drive it without CSS fighting each
  // frame. active:scale gives every pressable element physical feedback.
  // Literal 8px radius per the Figma Onboarding design system. NOT
  // rounded-lg: this project's @theme remaps --radius-lg to 10-12px,
  // which renders visibly rounder than the design.
  "inline-flex items-center justify-center gap-2 select-none whitespace-nowrap rounded-[8px] font-alt font-semibold tracking-[0.04em] text-base leading-6 transition-[transform,color,background-color,border-color,box-shadow,filter] duration-[var(--duration-fast)] ease-[var(--ease-snappy)] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
  {
    variants: {
      variant: {
        // Primary: Brand gradient with glow. Text uses --color-primary-foreground
        // (#1a0e08, near-black) rather than white — white-on-coral measures
        // ~2.3:1 against the gradient start and fails WCAG AA outright. Verified
        // (WCAG 2.1 AA, 4.5:1 required at this component's 16px/600 weight text):
        //   #1a0e08 on --color-primary   (#ff8a5c, gradient start) = 8.14:1
        //   #1a0e08 on --color-primary-600 (#e06a3c, gradient end) = 5.67:1
        primary: cn(
          "bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-primary-600)_100%)]",
          "text-[var(--color-primary-foreground)] shadow-[0_8px_30px_0_rgba(255,138,92,0.35)]",
          "hover:brightness-110 active:brightness-95"
        ),
        // Secondary: solid tinted surface with a real border — the old 10%-opacity
        // fill + white text failed WCAG contrast (~1.2:1). Verified pairings
        // (WCAG 2.1 AA, 4.5:1 required at this component's 14-16px/600 weight
        // text size — it does not qualify for the 3:1 large-text threshold):
        //   light: --color-primary-800 (#96401f) on --color-primary-50 (#fff3ec) = 6.32:1
        //   dark:  --color-primary-100 (#ffe1d0) on solid --color-primary-900 (#6e2e16) = 8.20:1
        // Both backgrounds are solid (no color-mix/opacity) so the ratios above
        // are the actual rendered contrast, not dependent on what sits behind the button.
        secondary: cn(
          "border border-[var(--color-primary)] bg-[var(--color-primary-50)] text-[var(--color-primary-800)]",
          "hover:bg-[var(--color-primary-100)] active:bg-[var(--color-primary-200)]",
          "dark:bg-[var(--color-primary-900)] dark:text-[var(--color-primary-100)] dark:border-[var(--color-primary-400)]",
          "dark:hover:bg-[var(--color-primary-800)]"
        ),
        // Tertiary: Gradient text only (ghost/link style)
        tertiary: cn(
          "relative text-transparent bg-clip-text",
          "bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--color-primary-600)_100%)]",
          "hover:opacity-90 active:opacity-80"
        ),
        // Destructive: Error/Delete actions
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Outline: Bordered transparent
        outline:
          "border border-border-default bg-transparent text-foreground hover:bg-surface-overlay",
        // Ghost: No background until hover
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        // Link: Text only with underline
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-11 px-[18px] py-2.5 text-sm",
        md: "h-12 px-6 py-3",
        lg: "h-14 px-8 py-4",
        xl: "h-[60px] px-[38px] py-[18px]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as child component (for Link wrapping) */
  asChild?: boolean;
  /** Show loading spinner */
  loading?: boolean;
  /** Text to show when loading */
  loadingText?: string;
  /** Make button full width */
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText = "Please wait...",
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    // For asChild, we can't show loading state properly
    if (asChild) {
      return (
        <Comp
          className={cn(
            buttonVariants({ variant, size }),
            fullWidth && "w-full",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <button
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-live="polite"
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size="sm" color="current" aria-hidden="true" />
            <span>{loadingText}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
