/**
 * Extract a preview of a problem statement, limited to a given number of lines.
 *
 * - If the statement has fewer or equal lines than `lineLimit`, returns as-is.
 * - If truncated, appends "..." to indicate more content follows.
 */
export function extractPreview(statement: string, lineLimit: number): string {
  if (lineLimit <= 0) {
    return "...";
  }

  const lines = statement.split("\n");

  if (lines.length <= lineLimit) {
    return statement;
  }

  return lines.slice(0, lineLimit).join("\n") + "\n...";
}
