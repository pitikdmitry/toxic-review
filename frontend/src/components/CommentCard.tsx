"use client";

import { useState } from "react";
import Link from "next/link";
import type { FeedComment, DiffContextLine } from "@/types";
import { VoteButtons } from "./VoteButtons";
import { timeAgo } from "@/lib/timeago";

const SEVERITY_COLORS: Record<string, { badge: string; border: string }> = {
  error: {
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
    border: "border-l-red-500",
  },
  warning: {
    badge: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    border: "border-l-yellow-500",
  },
  suggestion: {
    badge: "bg-[var(--accent-soft)] text-[var(--accent)]",
    border: "border-l-[var(--accent)]",
  },
  info: {
    badge: "bg-gray-500/10 text-[var(--text-secondary)]",
    border: "border-l-gray-400 dark:border-l-gray-600",
  },
};

const CRINGE_LABELS = [
  { label: "Sassy", emoji: "😏", color: "text-[var(--accent)]", bg: "bg-[var(--accent-soft)]" },
  { label: "Passive-Aggressive", emoji: "🙂", color: "text-violet-500", bg: "bg-violet-500/8" },
  { label: "Toxic", emoji: "💀", color: "text-amber-500", bg: "bg-amber-500/8" },
  { label: "Roast", emoji: "🔥", color: "text-orange-500", bg: "bg-orange-500/8" },
  { label: "Unhinged", emoji: "🤯", color: "text-red-500", bg: "bg-red-500/8" },
];

function CringeIndicator({ level }: { level: number }) {
  const cringe = CRINGE_LABELS[level - 1] || CRINGE_LABELS[2];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${cringe.color} ${cringe.bg}`}>
      <span className="text-xs">{cringe.emoji}</span>
      {cringe.label}
    </span>
  );
}

function truncatePath(path: string, maxLen: number = 40): string {
  if (path.length <= maxLen) return path;
  const parts = path.split("/");
  if (parts.length <= 2) return "..." + path.slice(-maxLen + 3);
  return ".../" + parts.slice(-2).join("/");
}

function DiffSnippet({ lines }: { lines: DiffContextLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="rounded-lg border border-[var(--border-primary)] overflow-hidden">
      <table className="diff-table" style={{ tableLayout: "fixed", width: "100%" }}>
        <tbody>
          {lines.map((line, i) => {
            const rowClass =
              line.type === "addition"
                ? "diff-line-addition"
                : line.type === "deletion"
                  ? "diff-line-deletion"
                  : line.type === "hunk-header"
                    ? "diff-line-hunk"
                    : "diff-line-context";
            return (
              <tr key={i} className={rowClass}>
                <td className="diff-line-num">
                  {line.type !== "hunk-header" && line.type !== "addition"
                    ? line.old_line_number ?? ""
                    : ""}
                </td>
                <td className="diff-line-num">
                  {line.type !== "hunk-header" && line.type !== "deletion"
                    ? line.new_line_number ?? ""
                    : ""}
                </td>
                <td>
                  {line.type === "addition"
                    ? "+"
                    : line.type === "deletion"
                      ? "-"
                      : line.type === "hunk-header"
                        ? ""
                        : " "}
                  {line.content}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface CommentCardProps {
  comment: FeedComment;
  onVote: (commentId: number, value: number) => void;
}

export function CommentCard({ comment, onVote }: CommentCardProps) {
  const [diffExpanded, setDiffExpanded] = useState(false);
  const colors = SEVERITY_COLORS[comment.severity] || SEVERITY_COLORS.info;

  return (
    <div
      className={`flex gap-3 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-card)] p-4 border-l-[3px] ${colors.border} transition-colors hover:border-[var(--border-primary)]`}
    >
      {/* Vote column */}
      <div className="shrink-0 pt-1">
        <VoteButtons
          score={comment.score}
          userVote={comment.user_vote}
          onVote={(value) => onVote(comment.id, value)}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Comment body — the hero */}
        <p className="text-[15px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap mb-3">
          {comment.body}
        </p>

        {/* Meta row: badges + file info */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colors.badge}`}
          >
            {comment.severity}
          </span>
          {comment.category && comment.category !== "general" && (
            <span className="rounded-md bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
              {comment.category}
            </span>
          )}
          <CringeIndicator level={comment.cringe_level} />
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono truncate ml-auto">
            {truncatePath(comment.file_path)}:{comment.line_number}
          </span>
        </div>

        {/* Collapsible diff */}
        {comment.diff_context.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setDiffExpanded(!diffExpanded)}
              className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors mb-1.5"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${diffExpanded ? "rotate-90" : ""}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {diffExpanded ? "Hide code" : "Show code"}
            </button>
            {diffExpanded && <DiffSnippet lines={comment.diff_context} />}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
          <span>
            {comment.repo_owner}/{comment.repo_name} #{comment.pr_number}
          </span>
          <span className="text-[var(--border-primary)]">|</span>
          <Link
            href={`/reviews/${comment.review_id}`}
            className="hover:text-[var(--accent)] transition-colors"
          >
            View full review
          </Link>
          <span className="ml-auto shrink-0">
            {timeAgo(comment.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
