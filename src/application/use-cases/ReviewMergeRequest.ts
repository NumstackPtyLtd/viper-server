import { Review } from "../../domain/entities/Review.js";
import { ReviewFinding } from "../../domain/entities/ReviewFinding.js";
import { Severity } from "../../domain/value-objects/Severity.js";
import { FilePath } from "../../domain/value-objects/FilePath.js";
import { LineNumber } from "../../domain/value-objects/LineNumber.js";
import { MergeRequestId } from "../../domain/value-objects/MergeRequestId.js";
import type { VcsProvider } from "@supaproxy/viper-vcs-providers";
import type { AiReviewer } from "@supaproxy/viper-ai-providers";
import type { ConfigLoader } from "../../domain/ports/ConfigLoader.js";
import type { EventBus } from "../../domain/ports/EventBus.js";
import type { WikiRepository } from "../../domain/ports/WikiRepository.js";
import type { ReviewMergeRequestDTO } from "../dto/ReviewMergeRequestDTO.js";
import type { PolicyResolver } from "../services/PolicyResolver.js";
import { DiffFormatter } from "../services/DiffFormatter.js";
import { CommentFormatter } from "../services/CommentFormatter.js";

export class ReviewMergeRequest {
  constructor(
    private readonly vcs: VcsProvider,
    private readonly ai: AiReviewer,
    private readonly configLoader: ConfigLoader,
    private readonly eventBus: EventBus,
    private readonly policyResolver: PolicyResolver | null = null,
    private readonly wiki: WikiRepository | null = null
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

    // 2b. Resolve wiki entries via policies
    const matchedWikiIds: string[] = [];
    let rules = config.rules;
    if (this.policyResolver && dto.orgId && dto.internalProjectId) {
      const changedFiles = filteredFiles.map((f) => f.newPath);
      const resolved = this.policyResolver.resolveWikiForReview(
        dto.orgId, dto.internalProjectId, changedFiles
      );
      if (resolved.length > 0) {
        const MAX_WIKI_CHARS = 8000;
        let wikiContext = '';
        for (const r of resolved) {
          const section = `## ${r.entry.title}\n${r.entry.content}`;
          if (wikiContext.length + section.length > MAX_WIKI_CHARS) break;
          wikiContext += (wikiContext ? '\n\n---\n\n' : '') + section;
          matchedWikiIds.push(r.entry.id);
        }
        if (wikiContext) {
          rules = [...config.rules, `\n--- Wiki Knowledge Base ---\n${wikiContext}`];
        }
      }
    }

    // 3. Ask AI to review
    const aiResult = await this.ai.review({
      diff: diffText,
      mrTitle: dto.title,
      mrDescription: dto.description,
      customRules: rules,
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

    // 8. Update wiki match counts
    if (matchedWikiIds.length > 0 && this.wiki) {
      this.wiki.incrementMatchCount(matchedWikiIds);
    }

    return review;
  }
}
