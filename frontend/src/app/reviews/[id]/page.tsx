"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getReview, publishComments } from "@/lib/api";
import { DiffView } from "@/components/DiffView";
import type { Review, ReviewComment } from "@/types";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Send,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const SEVERITY_DOT: Record<string, string> = {
  error: "bg-red-500",
  warning: "bg-yellow-500",
  suggestion: "bg-[var(--accent)]",
  info: "bg-gray-400",
};

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = Number(params.id);

  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState("");

  useEffect(() => {
    getReview(reviewId)
      .then((r) => {
        setReview(r);
        const unpublished = new Set(
          r.comments.filter((c) => !c.published).map((c) => c.id)
        );
        setSelectedIds(unpublished);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load review")
      )
      .finally(() => setLoading(false));
  }, [reviewId]);

  const handleToggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handlePublish = async () => {
    if (selectedIds.size === 0) return;
    setPublishing(true);
    setPublishResult("");
    try {
      const result = await publishComments(reviewId, Array.from(selectedIds));
      setPublishResult(`Published ${result.published} comments to GitHub`);
      const updated = await getReview(reviewId);
      setReview(updated);
      setSelectedIds(new Set());
    } catch (err) {
      setPublishResult(
        err instanceof Error ? err.message : "Failed to publish"
      );
    } finally {
      setPublishing(false);
    }
  };

  const selectAll = () => {
    if (!review) return;
    setSelectedIds(
      new Set(review.comments.filter((c) => !c.published).map((c) => c.id))
    );
  };

  const selectNone = () => setSelectedIds(new Set());

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2
          size={28}
          className="animate-spin text-[var(--accent)]"
        />
        <span className="text-sm text-[var(--text-secondary)]">
          Loading review...
        </span>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-500">{error || "Review not found"}</p>
        <Link
          href="/"
          className="mt-4 inline-block text-[var(--accent)] hover:underline"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const severityCounts = review.comments.reduce(
    (acc, c) => {
      acc[c.severity] = (acc[c.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const unpublishedCount = review.comments.filter((c) => !c.published).length;
  const selectedCount = selectedIds.size;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/")}
          className="mb-4 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
        >
          <ArrowLeft size={12} />
          Back
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              {review.pr_title || `PR #${review.pr_number}`}
            </h1>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              <span className="font-mono">
                {review.repo_owner}/{review.repo_name}#{review.pr_number}
              </span>
              {review.pr_author && (
                <span className="text-[var(--text-tertiary)]">
                  {" "}
                  by {review.pr_author}
                </span>
              )}
              <span className="text-[var(--text-tertiary)]">
                {" "}
                &middot; {new Date(review.created_at).toLocaleString()}
              </span>
            </p>
          </div>
          <a
            href={review.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-primary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all shrink-0"
          >
            <ExternalLink size={12} />
            GitHub
          </a>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        {/* Left: Diff */}
        <div className="min-w-0 flex-1">
          {publishResult && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                publishResult.startsWith("Published")
                  ? "border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-400"
                  : "border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-400"
              }`}
            >
              {publishResult.startsWith("Published") ? (
                <CheckCircle2 size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              {publishResult}
            </div>
          )}

          <DiffView
            files={review.diff_data}
            comments={review.comments}
            selectedIds={selectedIds}
            onToggle={handleToggle}
          />
        </div>

        {/* Right: Sidebar */}
        <div className="sticky top-20 w-72 shrink-0 hidden lg:block space-y-4">
          {/* Summary card */}
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] overflow-hidden">
            <div className="border-b border-[var(--border-primary)] px-4 py-3">
              <h2 className="text-sm font-semibold">Review Summary</h2>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                {review.comments.length} comment
                {review.comments.length !== 1 ? "s" : ""} found
              </p>
            </div>

            {/* Severity breakdown */}
            <div className="border-b border-[var(--border-primary)] px-4 py-3 space-y-2">
              {(["error", "warning", "suggestion", "info"] as const).map(
                (s) => {
                  const count = severityCounts[s];
                  if (!count) return null;
                  return (
                    <div
                      key={s}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${SEVERITY_DOT[s]}`}
                        />
                        {s}
                      </span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">
                        {count}
                      </span>
                    </div>
                  );
                }
              )}
            </div>

            {/* Actions */}
            <div className="border-b border-[var(--border-primary)] px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] mb-3">
                <button
                  onClick={selectAll}
                  className="text-[var(--accent)] hover:underline"
                >
                  Select all
                </button>
                <span className="text-[var(--text-tertiary)]">&middot;</span>
                <button
                  onClick={selectNone}
                  className="text-[var(--accent)] hover:underline"
                >
                  Deselect all
                </button>
              </div>
              <button
                onClick={handlePublish}
                disabled={publishing || selectedCount === 0}
                className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-all"
              >
                {publishing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                Publish {selectedCount} to GitHub
              </button>
            </div>

            {/* Comment list */}
            <div className="max-h-[calc(100vh-420px)] overflow-y-auto">
              {review.comments.map((c) => (
                <SidebarComment
                  key={c.id}
                  comment={c}
                  selected={selectedIds.has(c.id)}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>

          {/* AI Summary */}
          {review.summary && (
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md gradient-brand">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m16 18 2-2-2-2" />
                    <path d="m8 18-2-2 2-2" />
                  </svg>
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  AI Summary
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                {review.summary}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarComment({
  comment,
  selected,
  onToggle,
}: {
  comment: ReviewComment;
  selected: boolean;
  onToggle: (id: number) => void;
}) {
  const dot = SEVERITY_DOT[comment.severity] || SEVERITY_DOT.info;

  return (
    <label
      className={`flex gap-2.5 border-b border-[var(--border-secondary)] px-4 py-2.5 cursor-pointer hover:bg-[var(--accent-soft)] transition-all ${
        selected ? "bg-[var(--accent-soft)]" : ""
      }`}
    >
      {comment.published ? (
        <span className="mt-0.5 shrink-0">
          <CheckCircle2
            size={14}
            className="text-green-500 dark:text-green-400"
          />
        </span>
      ) : (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(comment.id)}
          className="mt-0.5 shrink-0 accent-[var(--accent)]"
        />
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
          <span className="font-mono truncate">
            {comment.file_path}:{comment.line_number}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
          {comment.body}
        </p>
        {comment.published && (
          <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
            Published
          </span>
        )}
      </div>
    </label>
  );
}
