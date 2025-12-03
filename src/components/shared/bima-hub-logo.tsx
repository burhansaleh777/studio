
import type { SVGProps } from 'react';

export function BimaHubLogo({ className, ...props }: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      width="160" // Adjusted width for potentially longer text
      height="40"
      viewBox="0 0 160 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
      aria-label="Bima Hub Logo"
    >
      <rect width="160" height="40" rx="8" fill="hsl(var(--primary))" />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="var(--font-inter), sans-serif"
        fontSize="20"
        fontWeight="bold"
        fill="hsl(var(--primary-foreground))"
      >
        BIMA HUB
      </text>
    </svg>
  );
}
