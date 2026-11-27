const REPO = "https://github.com/kamranheyderli/pickstack";

/**
 * A new GitHub issue with the stack the visitor is looking at, so a report about generated
 * code can be reproduced from the link.
 */
export function feedbackUrl(pageUrl: string): string {
  const body = [
    "**What happened, or what would you like?**",
    "",
    "",
    "",
    `**Stack:** ${pageUrl}`,
  ].join("\n");
  const params = new URLSearchParams({ body });
  return `${REPO}/issues/new?${params.toString()}`;
}
