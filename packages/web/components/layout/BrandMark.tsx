import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * The FundBrave icon mark — brand-orange gradient, transparent background.
 * Uses the pre-generated square (padded, not stretched) 192px source, not
 * the 1024x1174 non-square master — rendering that at equal width/height
 * would squish it.
 */
export function BrandMark({ size = 24, className }: BrandMarkProps) {
  return (
    <Image
      src="/icon-mark-192.png"
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      priority
    />
  );
}

export default BrandMark;
