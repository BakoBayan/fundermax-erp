import React from "react";

export interface BakoLogoProps {
  className?: string;
  size?: number;
  /**
   * 'badge': wrapped in the sleek, theme-adaptive squircle badge (default)
   * 'icon': raw standalone SVG icon in Lucide style (inherits currentColor)
   */
  variant?: "badge" | "icon";
  strokeWidth?: number;
}

/**
 * Bako Master System Brandmark
 * 
 * Handcrafted in the crisp, modern stroke aesthetic of the Lucide design system:
 * - 24x24 vector coordinate grid with 2px stroke geometry
 * - Top Isometric Diamond: Wood Panels & Precision Craftsmanship
 * - Center Structural Axis: Architectural Stability & Precision
 * - Left Facet: Warehouse Logistics & Modular Inventory Division
 * - Right Facet: Distinct "B" Monogram (Bako Master System Brand Identity)
 */
export const BakoLogo: React.FC<BakoLogoProps> = ({
  className = "",
  size = 40,
  variant = "badge",
  strokeWidth = 2,
}) => {
  const iconSvg = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={variant === "badge" ? "w-[62%] h-[62%] transition-transform duration-200 group-hover:scale-108 shrink-0" : "w-full h-full shrink-0"}
      aria-hidden="true"
    >
      {/* Top Isometric Diamond: Precision Wood Panels & Dimensions */}
      <path d="m12 2.5 7 4-7 4-7-4 7-4Z" />
      
      {/* Center Structural Axis */}
      <path d="M12 10.5V21" />
      
      {/* Left Facet: Modular Warehouse Inventory & Stacking Slices */}
      <path d="M5 6.5V17l7 4" />
      <path d="m5 12 7 4" />
      
      {/* Right Facet: Distinct Bako "B" Monogram Lobes */}
      <path d="M12 10.5h4a2.75 2.75 0 0 1 0 5.5H12" />
      <path d="M12 16h4.5a2.5 2.5 0 0 1 0 5H12" />
    </svg>
  );

  if (variant === "icon") {
    return (
      <span
        style={{ width: size, height: size }}
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
      >
        {iconSvg}
      </span>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 rounded-xl sm:rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/15 border border-emerald-500/25 dark:border-emerald-400/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center select-none overflow-hidden group shadow-xs transition-colors duration-200 ${className}`}
    >
      {/* Ambient glass sheen on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-sky-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {iconSvg}
    </div>
  );
};

export default BakoLogo;

