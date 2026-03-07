import type { Review, ReviewListItem } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function createReview(prUrl: string, cringeLevel: number = 3) {
  return request<Review>("/api/reviews", {
    method: "POST",
    body: JSON.stringify({ pr_url: prUrl, cringe_level: cringeLevel }),
  });
}

export function listReviews() {
  return request<ReviewListItem[]>("/api/reviews");
}

export function getReview(id: number) {
  return request<Review>(`/api/reviews/${id}`);
}

export function publishComments(reviewId: number, commentIds: number[]) {
  return request<{ published: number }>(`/api/reviews/${reviewId}/publish`, {
    method: "POST",
    body: JSON.stringify({ comment_ids: commentIds }),
  });
}

export function deleteReview(id: number) {
  return request<{ deleted: boolean }>(`/api/reviews/${id}`, {
    method: "DELETE",
  });
}
