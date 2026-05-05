import Anthropic from "@anthropic-ai/sdk";
import type {
  AiReviewer,
  AiReviewRequest,
  AiReviewResult,
  AiDiscussionRequest,
} from "../../../domain/ports/AiReviewer.js";
import { logger } from "../../../shared/logger.js";

const REVIEW_SYSTEM_PROMPT = `You are Viper, an AI code reviewer for merge requests. You review diffs and provide actionable, specific feedback.

You MUST respond with valid JSON matching this schema:
{
  "summary": "Brief overall assessment (2-3 sentences)",
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "severity": "critical|warning|suggestion|praise",
      "comment": "Your specific, actionable comment"
    }
  ]
}

Rules:
- Be specific. Reference exact code when possible.
- "critical": bugs, security issues, data loss risks
- "warning": potential issues, bad patterns, missing error handling
- "suggestion": style, readability, better alternatives
- "praise": genuinely good patterns worth calling out (use sparingly)
- Keep comments concise but helpful. Explain WHY, not just WHAT.
- If the diff is clean, return an empty findings array with a positive summary.
- Line numbers must reference lines in the NEW version of the file (lines starting with + in the diff).`;

const DISCUSSION_SYSTEM_PROMPT = `You are Viper, an AI code reviewer. A developer replied to one of your review comments. Respond helpfully and concisely. If they've addressed your concern, acknowledge it. If not, explain further. Keep it conversational and brief.`;

export class ClaudeAiReviewer implements AiReviewer {
  private readonly client: Anthropic;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = "claude-sonnet-4-20250514"
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async review(request: AiReviewRequest): Promise<AiReviewResult> {
    const userPrompt = this.buildReviewPrompt(request);

    logger.info({ model: this.model, mrTitle: request.mrTitle }, "Requesting review from Claude");

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: REVIEW_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return this.parseResponse(text);
  }

  async respondToDiscussion(request: AiDiscussionRequest): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: DISCUSSION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Your original comment:\n${request.originalComment}\n\nDeveloper's reply:\n${request.developerReply}\n\nCurrent diff context:\n\`\`\`\n${request.diffContext}\n\`\`\``,
        },
      ],
    });

    return response.content[0].type === "text"
      ? response.content[0].text
      : "I couldn't process that reply. Could you clarify?";
  }

  private buildReviewPrompt(request: AiReviewRequest): string {
    const parts: string[] = [];

    parts.push(`## Merge Request\n**Title:** ${request.mrTitle}`);
    if (request.mrDescription) {
      parts.push(`**Description:** ${request.mrDescription}`);
    }
    if (request.customRules.length > 0) {
      parts.push(`## Custom Rules\n${request.customRules.map((r) => `- ${r}`).join("\n")}`);
    }
    if (request.focusAreas.length > 0) {
      parts.push(`## Focus Areas\n${request.focusAreas.join(", ")}`);
    }
    parts.push(`## Tone\n${request.tone}`);
    parts.push(`## Language\nRespond in ${request.language}`);
    parts.push(`## Diff\n\`\`\`diff\n${request.diff}\n\`\`\``);

    return parts.join("\n\n");
  }

  private parseResponse(text: string): AiReviewResult {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch?.[1] ?? text;

    try {
      const parsed = JSON.parse(jsonStr.trim());
      return {
        summary: parsed.summary ?? "Review complete.",
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      };
    } catch {
      logger.warn({ text: text.slice(0, 200) }, "Failed to parse Claude response as JSON");
      return { summary: text.slice(0, 500), findings: [] };
    }
  }
}
