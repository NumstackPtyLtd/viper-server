const VALID_SEVERITIES = ["critical", "warning", "suggestion", "praise"] as const;

export type SeverityLevel = (typeof VALID_SEVERITIES)[number];

export class Severity {
  private constructor(private readonly value: SeverityLevel) {}

  static critical(): Severity {
    return new Severity("critical");
  }

  static warning(): Severity {
    return new Severity("warning");
  }

  static suggestion(): Severity {
    return new Severity("suggestion");
  }

  static praise(): Severity {
    return new Severity("praise");
  }

  static from(value: string): Severity {
    if (!VALID_SEVERITIES.includes(value as SeverityLevel)) {
      throw new Error(`Invalid severity: ${value}. Must be one of: ${VALID_SEVERITIES.join(", ")}`);
    }
    return new Severity(value as SeverityLevel);
  }

  toString(): string {
    return this.value;
  }

  isCritical(): boolean {
    return this.value === "critical";
  }

  isActionable(): boolean {
    return this.value !== "praise";
  }

  equals(other: Severity): boolean {
    return this.value === other.value;
  }
}
