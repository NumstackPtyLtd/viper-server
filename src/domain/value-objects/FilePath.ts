export class FilePath {
  private constructor(private readonly value: string) {}

  static from(value: string): FilePath {
    if (!value || value.trim().length === 0) {
      throw new Error("FilePath cannot be empty");
    }
    return new FilePath(value.trim());
  }

  toString(): string {
    return this.value;
  }

  extension(): string {
    const parts = this.value.split(".");
    return parts.length > 1 ? parts[parts.length - 1] : "";
  }

  equals(other: FilePath): boolean {
    return this.value === other.value;
  }
}
