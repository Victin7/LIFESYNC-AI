import { Skeleton } from "@/components/ui/skeleton";

type Props =
  | { variant?: "lines"; lines?: number; className?: string }
  | { variant: "chart"; height?: number; className?: string };

export function SkeletonCard(props: Props) {
  const className = props.className ?? "";
  if (props.variant === "chart") {
    const h = props.height ?? 160;
    return (
      <div className={`rounded-2xl border border-border bg-card-grad p-5 ${className}`}>
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="w-full" style={{ height: h }} />
      </div>
    );
  }
  const n = ("lines" in props && props.lines) || 3;
  return (
    <div className={`rounded-2xl border border-border bg-card-grad p-5 space-y-3 ${className}`}>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-24" />
      {Array.from({ length: Math.max(0, n - 2) }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}
