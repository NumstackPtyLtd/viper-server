import type { Review } from "../../domain/entities/Review.js";
import type { ReviewFinding } from "../../domain/entities/ReviewFinding.js";

const VIPER_SIGNATURE = "\n\n---\n*Review by [Viper](https://github.com/NumstackPtyLtd/viper-server)*";

export class CommentFormatter {
  static formatSummary(review: Review): string {
    const findings = review.getFindings();
    const critical = findings.filter((f) => f.getSeverity().isCritical()).length;
    const warnings = findings.filter((f) => f.getSeverity().toString() === "warning").length;
    const suggestions = findings.filter((f) => f.getSeverity().toString() === "suggestion").length;
    const praiseItems = findings.filter((f) => f.getSeverity().toString() === "praise");

    const counts: string[] = [];
    if (critical > 0) counts.push(`${critical} critical`);
    if (warnings > 0) counts.push(`${warnings} warning${warnings > 1 ? "s" : ""}`);
    if (suggestions > 0) counts.push(`${suggestions} suggestion${suggestions > 1 ? "s" : ""}`);
    if (praiseItems.length > 0) counts.push(`${praiseItems.length} praise`);

    const countLine = counts.length > 0 ? `\n\n**Findings:** ${counts.join(" | ")}` : "";

    const praiseSection =
      praiseItems.length > 0
        ? `\n\n**Nice:**\n${praiseItems.map((p) => `- \`${p.getFile().toString()}:${p.getLine().toNumber()}\` — ${p.getComment()}`).join("\n")}`
        : "";

    return `## Viper Review\n\n${review.getSummary()}${countLine}${praiseSection}${VIPER_SIGNATURE}`;
  }

  static formatFinding(finding: ReviewFinding): string {
    const severity = finding.getSeverity().toString();
    const icon =
      severity === "critical"
        ? ":rotating_light:"
        : severity === "warning"
          ? ":warning:"
          : ":bulb:";

    return `${icon} **${severity}**: ${finding.getComment()}`;
  }
}
