import { Review } from "../../domain/entities/Review.js";
import { ReviewFinding } from "../../domain/entities/ReviewFinding.js";
import { Severity } from "../../domain/value-objects/Severity.js";
import { FilePath } from "../../domain/value-objects/FilePath.js";
import { LineNumber } from "../../domain/value-objects/LineNumber.js";
import { MergeRequestId } from "../../domain/value-objects/MergeRequestId.js";
import type { VcsProvider } from "../../domain/ports/VcsProvider.js";
import type { AiReviewer } from "../../domain/ports/AiReviewer.js";
import type { ConfigLoader } from "../../domain/ports/ConfigLoader.js";
import type { EventBus } from "../../domain/ports/EventBus.js";
import type { ReviewMergeRequestDTO } from "../dto/ReviewMergeRequestDTO.js";
import { DiffFormatter } from "../services/DiffFormatter.js";
import { CommentFormatter } from "../services/CommentFormatter.js";

export class ReviewMergeRequest {
  constructor(
    private readonly vcs: VcsProvider,
    private readonly ai: AiReviewer,
    private readonly configLoader: ConfigLoader,
    private readonly eventBus: EventBus
  ) {}

  async execute(dto: ReviewMergeRequestDTO): Promise<Review> {
    const mrId = MergeRequestId.create(dto.projectId, dto.mrIid);

    // 1. Load config from the repo
    const config = await this.configLoader.load(dto.projectId, dto.sourceBranch);

    // 2. Get the diff
    const diffFiles = await this.vcs.getMergeRequestDiff(dto.projectId, dto.mrIid);
    const filteredFiles = DiffFormatter.filterIgnored(diffFiles, config.ignore);

    if (filteredFiles.length === 0) {
      return Review.create({ mergeRequestId: mrId, summary: "No reviewable changes.", findings: [] });
    }

    const diffText = DiffFormatter.format(filteredFiles);

    // 3. Ask AI to review
    const aiResult = await this.ai.review({
      diff: diffText,
      mrTitle: dto.title,
      mrDescription: dto.description,
      customRules: config.rules,
      focusAreas: config.style.focus,
      tone: config.style.tone,
      language: config.style.language,
    });

    // 4. Map AI findings to domain entities
    const findings = aiResult.findings
      .slice(0, config.maxComments)
      .map((f) =>
        ReviewFinding.create({
          file: FilePath.from(f.file),
          line: LineNumber.from(f.line),
          severity: Severity.from(f.severity),
          comment: f.comment,
        })
      );

    // 5. Create the review aggregate
    const review = Review.create({
      mergeRequestId: mrId,
      summary: aiResult.summary,
      findings,
    });

    // 6. Post results to VCS
    const version = await this.vcs.getMergeRequestVersion(dto.projectId, dto.mrIid);

    await this.vcs.createComment(
      dto.projectId,
      dto.mrIid,
      CommentFormatter.formatSummary(review)
    );

    if (version) {
      for (const finding of review.getActionableFindings()) {
        try {
          await this.vcs.createInlineComment(
            dto.projectId,
            dto.mrIid,
            CommentFormatter.formatFinding(finding),
            {
              baseSha: version.baseSha,
              startSha: version.startSha,
              headSha: version.headSha,
              filePath: finding.getFile().toString(),
              line: finding.getLine().toNumber(),
            }
          );
        } catch {
          await this.vcs.createComment(
            dto.projectId,
            dto.mrIid,
            `**${finding.getFile().toString()}:${finding.getLine().toNumber()}** — ${CommentFormatter.formatFinding(finding)}`
          );
        }
      }
    }

    // 7. Publish domain events
    await this.eventBus.publishAll(review.pullDomainEvents());

    return review;
  }
}
