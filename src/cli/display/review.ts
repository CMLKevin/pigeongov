import chalk from "chalk";

import type { ReviewSummary } from "../../types.js";

export function renderReview(review: ReviewSummary): string {
  const lines: string[] = [];

  // Determine if refund or owed from headline text
  const isRefund = review.headline.toLowerCase().includes("refund");
  const bannerColor = isRefund ? chalk.bgGreen.black.bold : chalk.bgRed.white.bold;

  // Banner headline
  lines.push(bannerColor(` ${review.headline} `));
  lines.push("");

  // Notes
  for (const note of review.notes) {
    lines.push(`  ${chalk.dim("\u2502")} ${note}`);
  }

  // Flagged fields summary
  if (review.flaggedFields.length > 0) {
    lines.push("");
    lines.push(
      chalk.dim(`  ${review.flaggedFields.length} field${review.flaggedFields.length === 1 ? "" : "s"} flagged for review`),
    );
  }

  return lines.join("\n");
}
