"use client";

import { useCallback, useEffect, useState } from "react";
import { PRInput } from "@/components/PRInput";
import { FeedTabs } from "@/components/FeedTabs";
import { CommentCard } from "@/components/CommentCard";
import { fetchFeed, voteComment } from "@/lib/api";
import { getFingerprint } from "@/lib/fingerprint";
import type { FeedComment, FeedResponse } from "@/types";
import { MessageSquare } from "lucide-react";

export default function HomePage() {
  const [sort, setSort] = useState("hot");
  const [period, setPeriod] = useState("all");
  const [page, setPage] = useState(1);
  const [feedData, setFeedData] = useState<FeedResponse | null>(null);
  const [items, setItems] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fingerprint, setFingerprint] = useState("");

  useEffect(() => {
    getFingerprint().then(setFingerprint);
  }, []);

  const loadFeed = useCallback(
    async (pageNum: number, append: boolean = false) => {
      setLoading(true);
      try {
        const data = await fetchFeed(sort, period, pageNum, 20, fingerprint || undefined);
        setFeedData(data);
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [sort, period, fingerprint],
  );

  useEffect(() => {
    setPage(1);
    loadFeed(1);
  }, [loadFeed]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadFeed(nextPage, true);
  };

  const handleVote = async (commentId: number, value: number) => {
    if (!fingerprint) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== commentId) return item;

        let newScore = item.score;
        let newUpvotes = item.upvotes;
        let newDownvotes = item.downvotes;
        let newUserVote: number | null;

        if (item.user_vote === value) {
          // Toggle off
          newScore -= value;
          if (value === 1) newUpvotes -= 1;
          else newDownvotes -= 1;
          newUserVote = null;
        } else if (item.user_vote !== null) {
          // Flip
          newScore += value - item.user_vote;
          if (value === 1) {
            newUpvotes += 1;
            newDownvotes -= 1;
          } else {
            newDownvotes += 1;
            newUpvotes -= 1;
          }
          newUserVote = value;
        } else {
          // New vote
          newScore += value;
          if (value === 1) newUpvotes += 1;
          else newDownvotes += 1;
          newUserVote = value;
        }

        return {
          ...item,
          score: newScore,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          user_vote: newUserVote,
        };
      }),
    );

    try {
      await voteComment(commentId, fingerprint, value);
      // Re-fetch to get correct sort order from the server
      setPage(1);
      await loadFeed(1);
    } catch {
      // Revert on error — reload feed
      setPage(1);
      loadFeed(1);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="mb-16 pt-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border-primary)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          Toxic Code Review
        </div>
        <h1 className="mb-3 text-4xl font-bold tracking-tight">
          Your PR is bad and you should{" "}
          <span className="gradient-brand-text">feel bad</span>
        </h1>
        <p className="mb-8 text-[var(--text-secondary)] max-w-lg mx-auto">
          Paste a GitHub PR and let our AI roast your code harder than
          your tech lead ever could. Cringe levels 1–5, tears not included.
        </p>
        <div className="mx-auto max-w-xl">
          <PRInput />
        </div>
      </section>

      {/* Feed */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Community Feed
          </h2>
          {feedData && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {feedData.total} comment{feedData.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <FeedTabs
          sort={sort}
          period={period}
          onSortChange={setSort}
          onPeriodChange={setPeriod}
        />

        {loading && items.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)] p-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <MessageSquare size={18} className="text-[var(--accent)]" />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              No review comments yet. Submit a PR URL above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <CommentCard
                key={item.id}
                comment={item}
                onVote={handleVote}
              />
            ))}

            {feedData?.has_more && (
              <div className="flex justify-center pt-4 pb-2">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-6 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
