import { useId } from "react";

/** The pickstack mark: modules being picked and stacked. Matches public/logo.svg. */
export function Logo({ size = 28 }: { size?: number }) {
  // Unique gradient id per logo; useId's punctuation isn't safe inside url(#…).
  const gradient = `pickstack-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradient}
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7c3aed" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gradient})`} />
      <rect
        x="14"
        y="40"
        width="36"
        height="9"
        rx="3"
        fill="#fff"
        opacity=".55"
      />
      <rect
        x="14"
        y="28"
        width="26"
        height="9"
        rx="3"
        fill="#fff"
        opacity=".8"
      />
      <rect x="14" y="16" width="16" height="9" rx="3" fill="#fff" />
      <path
        d="m37 21 4 4 8-9"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
