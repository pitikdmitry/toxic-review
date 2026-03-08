"use client";

interface VoteButtonsProps {
  score: number;
  userVote: number | null;
  onVote: (value: number) => void;
}

export function VoteButtons({ score, userVote, onVote }: VoteButtonsProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={() => onVote(1)}
        className={`p-1 rounded transition-colors ${
          userVote === 1
            ? "text-[var(--accent)]"
            : "text-[var(--text-tertiary)] hover:text-[var(--accent)]"
        }`}
        aria-label="Upvote"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>
      <span
        className={`text-xs font-bold tabular-nums ${
          userVote === 1
            ? "text-[var(--accent)]"
            : userVote === -1
              ? "text-red-500"
              : "text-[var(--text-secondary)]"
        }`}
      >
        {score}
      </span>
      <button
        onClick={() => onVote(-1)}
        className={`p-1 rounded transition-colors ${
          userVote === -1
            ? "text-red-500"
            : "text-[var(--text-tertiary)] hover:text-red-500"
        }`}
        aria-label="Downvote"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
