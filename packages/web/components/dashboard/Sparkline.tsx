"use client";

/**
 * Seven-day donation trend. Inline SVG, no charting dependency.
 *
 * Two deliberate choices:
 *
 * - The y-scale baselines at zero, not at the series minimum. Baselining at the
 *   minimum turns 800/810/805 into a mountain range, which on a fundraising
 *   dashboard misrepresents a flat week as a dramatic one.
 * - The end marker is a positioned span, not an SVG circle. The chart stretches
 *   with `preserveAspectRatio="none"`, and while `vector-effect` keeps the
 *   stroke honest it does nothing for a filled circle, which stretched into a
 *   dash.
 *
 * Accessibility: the drawing is aria-hidden; meaning is carried by the text
 * summary the caller renders beside it, since a bare polyline tells a screen
 * reader nothing.
 */

import { useId } from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  /** Oldest first. Two points minimum, otherwise nothing renders. */
  values: number[];
  className?: string;
}

const VIEW_W = 100;
const VIEW_H = 36;
/** Headroom so the peak's stroke is not clipped by the viewBox edge. */
const TOP_PAD = 3;

export function Sparkline({ values, className }: SparklineProps) {
  const gradientId = useId();
  if (values.length < 2) return null;

  const max = Math.max(...values, 0);
  const step = VIEW_W / (values.length - 1);
  const scale = max > 0 ? (VIEW_H - TOP_PAD) / max : 0;

  const points = values.map((value, i) => {
    const x = i * step;
    // All-zero week: sit on the baseline rather than dividing by zero.
    const y = max > 0 ? VIEW_H - value * scale : VIEW_H - 1;
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} ${VIEW_W},${VIEW_H} 0,${VIEW_H}`;
  const [, lastY] = points[points.length - 1];

  return (
    <div className={cn("relative h-11 w-full", className)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--fb-orange)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--fb-orange)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--fb-orange)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute right-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--fb-orange)]"
        style={{ top: `${(lastY / VIEW_H) * 100}%` }}
      />
    </div>
  );
}
