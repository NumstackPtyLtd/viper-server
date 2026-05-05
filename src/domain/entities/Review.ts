import { ReviewId } from "../value-objects/ReviewId.js";
import { MergeRequestId } from "../value-objects/MergeRequestId.js";
import type { ReviewFinding } from "./ReviewFinding.js";
import { ReviewCompletedEvent } from "../events/ReviewCompletedEvent.js";
import type { DomainEvent } from "../events/DomainEvent.js";

interface ReviewProps {
  mergeRequestId: MergeRequestId;
  summary: string;
  findings: ReviewFinding[];
}

export class Review {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: ReviewId,
    private readonly mergeRequestId: MergeRequestId,
    private readonly summary: string,
    private readonly findings: ReviewFinding[],
    private readonly createdAt: Date
  ) {}

  static create(props: ReviewProps): Review {
    const review = new Review(
      ReviewId.create(),
      props.mergeRequestId,
      props.summary,
      props.findings,
      new Date()
    );

    review.domainEvents.push(
      new ReviewCompletedEvent(
        review.id,
        review.mergeRequestId,
        review.findings.length
      )
    );

    return review;
  }

  getId(): ReviewId {
    return this.id;
  }

  getMergeRequestId(): MergeRequestId {
    return this.mergeRequestId;
  }

  getSummary(): string {
    return this.summary;
  }

  getFindings(): ReadonlyArray<ReviewFinding> {
    return this.findings;
  }

  getActionableFindings(): ReviewFinding[] {
    return this.findings.filter((f) => f.isActionable());
  }

  getCriticalCount(): number {
    return this.findings.filter((f) => f.getSeverity().isCritical()).length;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }
}
