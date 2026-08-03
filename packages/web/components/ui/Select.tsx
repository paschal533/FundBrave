"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "@/components/ui/icons";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Styled replacement for a native <select>: a trigger button opening an
 * origin-aware dropdown listbox that matches the app's input styling
 * (native selects render OS chrome that clashes with the design).
 *
 * Accessibility: combobox-button pattern. Focus stays on the trigger;
 * the panel is role="listbox" and the highlighted option is conveyed
 * via aria-activedescendant. Arrow keys move the highlight (opening
 * the panel if closed), Enter/Space select, Escape/Tab/outside-click
 * close. The panel animates 180ms from the trigger edge (scale +
 * opacity, expo-out) and renders instantly under prefers-reduced-motion
 * via the global reduced-motion rules.
 */
export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  panelClassName,
}: {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  panelClassName?: string;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const [highlighted, setHighlighted] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);

  // Opening always starts the highlight on the current selection.
  useEffect(() => {
    if (open) setHighlighted(selectedIndex);
  }, [open, selectedIndex]);

  // Outside click closes.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const commit = (index: number) => {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else setHighlighted((h) => Math.min(h + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) setOpen(true);
        else setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setHighlighted(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setHighlighted(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) commit(highlighted);
        else setOpen(true);
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const selected = options[selectedIndex];

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-activedescendant={
          open ? `${listboxId}-${highlighted}` : undefined
        }
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="flex h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-white/10 bg-surface-elevated px-4 text-base text-foreground transition-colors focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:w-auto sm:min-w-[150px] md:text-sm"
      >
        <span className="truncate">{selected?.label ?? ""}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn(
            "shrink-0 text-text-tertiary transition-transform duration-200 ease-out",
            open && "rotate-180"
          )}
        />
      </button>

      <ul
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        className={cn(
          "absolute right-0 top-full z-30 mt-2 min-w-full origin-top rounded-xl border border-white/10 bg-surface-elevated p-1.5 shadow-xl",
          "transition-[opacity,transform] duration-[180ms] ease-[var(--ease-out-expo)]",
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-[0.97] opacity-0",
          panelClassName
        )}
      >
        {options.map((option, index) => (
          <li
            key={option.value}
            id={`${listboxId}-${index}`}
            role="option"
            aria-selected={option.value === value}
            onPointerMove={() => setHighlighted(index)}
            onClick={() => commit(index)}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
              index === highlighted
                ? "bg-surface-overlay text-foreground"
                : "text-text-secondary",
              option.value === value && "font-semibold text-foreground"
            )}
          >
            {option.label}
            {option.value === value && (
              <Check size={16} className="text-primary" aria-hidden="true" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Select;
