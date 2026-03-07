"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PRInput } from "@/components/PRInput";
import { listReviews } from "@/lib/api";
import type { ReviewListItem } from "@/types";
import { GitPullRequest, MessageSquare, ChevronRight } from "lucide-react";

export default function HomePage() {
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listReviews()
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="mb-16 pt-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border-primary)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          AI-Powered Code Review
        </div>
        <h1 className="mb-3 text-4xl font-bold tracking-tight">
          Review PRs with{" "}
          <span className="gradient-brand-text">intelligence</span>
        </h1>
        <p className="mb-8 text-[var(--text-secondary)] max-w-lg mx-auto">
          Paste a GitHub Pull Request URL and get instant, actionable code
          review feedback powered by AI.
        </p>
        <div className="mx-auto max-w-xl">
          <PRInput />
        </div>
      </section>

      {/* Recent Reviews */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Recent Reviews
          </h2>
          {reviews.length > 0 && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)] p-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <GitPullRequest size={18} className="text-[var(--accent)]" />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              No reviews yet. Submit a PR URL above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {reviews.map((r) => (
              <Link
                key={r.id}
                href={`/reviews/${r.id}`}
                className="group flex items-center gap-4 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-card)] px-4 py-3.5 hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)] transition-all"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
                  <GitPullRequest
                    size={16}
                    className="text-[var(--accent)]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">
                    {r.pr_title || `PR #${r.pr_number}`}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {r.repo_owner}/{r.repo_name} #{r.pr_number}
                    {r.pr_author && (
                      <span className="text-[var(--text-tertiary)]">
                        {" "}
                        by {r.pr_author}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-md bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--text-secondary)] shrink-0">
                  <MessageSquare size={12} />
                  {r.comment_count}
                </div>
                <div className="text-xs text-[var(--text-tertiary)] shrink-0">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
                <ChevronRight
                  size={14}
                  className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors shrink-0"
                />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
