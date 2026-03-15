"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listReviews, deleteReview } from "@/lib/api";
import { timeAgo } from "@/lib/timeago";
import type { ReviewListItem } from "@/types";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listReviews()
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  };

  return (
    <div>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
      >
        <ArrowLeft size={12} />
        Back
      </Link>

      <h1 className="mb-6 text-xl font-bold tracking-tight">My Reviews</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)] p-12 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No reviews yet. Submit a PR URL on the{" "}
            <Link href="/" className="text-[var(--accent)] hover:underline">
              home page
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="group flex items-center gap-3 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--border-primary)]"
            >
              <Link href={`/reviews/${r.id}`} className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {r.pr_title || `PR #${r.pr_number}`}
                </p>
                <p className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                  <span className="font-mono">
                    {r.repo_owner}/{r.repo_name}#{r.pr_number}
                  </span>
                  <span>·</span>
                  <span>{r.comment_count} comments</span>
                  <span>·</span>
                  <span>{timeAgo(r.created_at)}</span>
                </p>
              </Link>
              <button
                onClick={() => handleDelete(r.id)}
                className="shrink-0 rounded-lg p-2 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
