"use client";

interface FeedTabsProps {
  sort: string;
  period: string;
  onSortChange: (sort: string) => void;
  onPeriodChange: (period: string) => void;
}

const TABS = [
  { key: "hot", label: "Hot" },
  { key: "top", label: "Top" },
  { key: "new", label: "New" },
];

const PERIODS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All Time" },
];

export function FeedTabs({ sort, period, onSortChange, onPeriodChange }: FeedTabsProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onSortChange(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              sort === tab.key
                ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sort === "top" && (
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
        >
          {PERIODS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
