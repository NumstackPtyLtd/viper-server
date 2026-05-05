import type { DomainEvent } from "./DomainEvent.js";
import type { ReviewId } from "../value-objects/ReviewId.js";
import type { MergeRequestId } from "../value-objects/MergeRequestId.js";

export class ReviewCompletedEvent implements DomainEvent {
  readonly name = "review.completed";
  readonly occurredAt: Date;

  constructor(
    readonly reviewId: ReviewId,
    readonly mergeRequestId: MergeRequestId,
    readonly findingsCount: number
  ) {
    this.occurredAt = new Date();
  }
}
