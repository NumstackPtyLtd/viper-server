import { Severity } from "../value-objects/Severity.js";
import { FilePath } from "../value-objects/FilePath.js";
import { LineNumber } from "../value-objects/LineNumber.js";

interface ReviewFindingProps {
  file: FilePath;
  line: LineNumber;
  severity: Severity;
  comment: string;
}

export class ReviewFinding {
  private constructor(
    private readonly file: FilePath,
    private readonly line: LineNumber,
    private readonly severity: Severity,
    private readonly comment: string
  ) {}

  static create(props: ReviewFindingProps): ReviewFinding {
    if (!props.comment || props.comment.trim().length === 0) {
      throw new Error("ReviewFinding comment cannot be empty");
    }
    return new ReviewFinding(props.file, props.line, props.severity, props.comment);
  }

  getFile(): FilePath {
    return this.file;
  }

  getLine(): LineNumber {
    return this.line;
  }

  getSeverity(): Severity {
    return this.severity;
  }

  getComment(): string {
    return this.comment;
  }

  isActionable(): boolean {
    return this.severity.isActionable();
  }
}
