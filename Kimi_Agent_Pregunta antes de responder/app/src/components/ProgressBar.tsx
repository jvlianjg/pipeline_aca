interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export default function ProgressBar({ value, max = 100, color = '#1E7A5F', height = 8, showLabel = true }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-[#F0F1F4] rounded-full overflow-hidden" style={{ height }}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-[13px] font-medium text-[#1A1D23] tabular-nums min-w-[48px] text-right">
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
