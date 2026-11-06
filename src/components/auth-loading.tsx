import { DiagramIcon } from "@/src/components/icons";

export default function AuthLoading({
  label = "正在加载…",
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-brand-strong text-white shadow-[0_12px_28px_-12px_rgba(37,99,235,0.9)]">
        <DiagramIcon className="size-6" />
      </span>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="size-1.5 animate-pulse rounded-full bg-brand" />
        {label}
      </div>
    </div>
  );
}
