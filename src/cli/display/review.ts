import type { ReviewSummary } from "../../types.js";

export function renderReview(review: ReviewSummary): string {
  return [review.headline, ...review.notes].join("\n");
}
