/**
 * Port: AI Reviewer
 *
 * Abstract interface for the AI engine that performs code reviews.
 * Infrastructure adapters (Claude, OpenAI, etc.) implement this port.
 */

export interface AiReviewRequest {
  diff: string;
  mrTitle: string;
  mrDescription: string | null;
  customRules: string[];
  focusAreas: string[];
  tone: string;
  language: string;
}

export interface AiReviewFinding {
  file: string;
  line: number;
  severity: "critical" | "warning" | "suggestion" | "praise";
  comment: string;
}

export interface AiReviewResult {
  summary: string;
  findings: AiReviewFinding[];
}

export interface AiDiscussionRequest {
  originalComment: string;
  developerReply: string;
  diffContext: string;
}

export interface AiReviewer {
  review(request: AiReviewRequest): Promise<AiReviewResult>;
  respondToDiscussion(request: AiDiscussionRequest): Promise<string>;
}
