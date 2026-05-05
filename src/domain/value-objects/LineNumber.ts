export class LineNumber {
  private constructor(private readonly value: number) {}

  static from(value: number): LineNumber {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`LineNumber must be a positive integer, got: ${value}`);
    }
    return new LineNumber(value);
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: LineNumber): boolean {
    return this.value === other.value;
  }
}
