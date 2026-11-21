import { cn } from "@/lib/utils";

export function Logo({ className, markOnly }: { className?: string; markOnly?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="size-5" fill="none">
          <path
            d="M5 6.5C5 5.12 6.8 4 9 4h10v14c0 1.1-1.5 2-3.2 2H9c-2.2 0-4-1.12-4-2.5V6.5Z"
            fill="currentColor"
            opacity=".35"
          />
          <path
            d="M5 7c0-1.38 1.8-2.5 4-2.5h10V17c0 1.38-1.8 2.5-4 2.5H9c-2.2 0-4-1.12-4-2.5V7Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M9 8.5h6.5M9 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      {markOnly ? null : (
        <span className="text-lg font-semibold tracking-tight">
          Stufy
        </span>
      )}
    </div>
  );
}
