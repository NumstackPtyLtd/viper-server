import { randomUUID } from "crypto";

export class ReviewId {
  private constructor(private readonly value: string) {}

  static create(): ReviewId {
    return new ReviewId(randomUUID());
  }

  static from(value: string): ReviewId {
    if (!value || value.trim().length === 0) {
      throw new Error("ReviewId cannot be empty");
    }
    return new ReviewId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ReviewId): boolean {
    return this.value === other.value;
  }
}
