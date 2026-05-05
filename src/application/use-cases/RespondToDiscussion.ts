import type { VcsProvider } from "../../domain/ports/VcsProvider.js";
import type { AiReviewer } from "../../domain/ports/AiReviewer.js";
import type { ConfigLoader } from "../../domain/ports/ConfigLoader.js";
import type { RespondToDiscussionDTO } from "../dto/RespondToDiscussionDTO.js";

const VIPER_SIGNATURE = "Review by [Viper]";

export class RespondToDiscussion {
  constructor(
    private readonly vcs: VcsProvider,
    private readonly ai: AiReviewer,
    private readonly configLoader: ConfigLoader
  ) {}

  async execute(dto: RespondToDiscussionDTO): Promise<void> {
    const discussions = await this.vcs.getDiscussions(dto.projectId, dto.mrIid);
    const discussion = discussions.find((d) => d.id === dto.discussionId);
    if (!discussion) return;

    const firstNote = discussion.notes[0];
    if (!firstNote) return;

    const isViperThread =
      firstNote.body.includes(VIPER_SIGNATURE) ||
      (dto.botUserId !== null && firstNote.authorId === dto.botUserId);

    if (!isViperThread) return;

    const diffContext = await this.getDiffContext(
      dto.projectId,
      dto.mrIid,
      firstNote.filePath
    );

    const reply = await this.ai.respondToDiscussion({
      originalComment: firstNote.body,
      developerReply: dto.noteBody,
      diffContext,
    });

    await this.vcs.replyToDiscussion(
      dto.projectId,
      dto.mrIid,
      dto.discussionId,
      reply
    );

    const config = await this.configLoader.load(dto.projectId, dto.sourceBranch);
    if (config.autoResolve && this.looksResolved(reply)) {
      try {
        await this.vcs.resolveDiscussion(dto.projectId, dto.mrIid, dto.discussionId, true);
      } catch {
        // Bot may lack permissions to resolve
      }
    }
  }

  private async getDiffContext(
    projectId: number,
    mrIid: number,
    filePath?: string
  ): Promise<string> {
    if (!filePath) return "";
    try {
      const files = await this.vcs.getMergeRequestDiff(projectId, mrIid);
      const file = files.find((f) => f.newPath === filePath);
      return file?.diff ?? "";
    } catch {
      return "";
    }
  }

  private looksResolved(viperResponse: string): boolean {
    const signals = [
      "looks good", "that works", "nice fix", "addressed",
      "resolved", "thanks for fixing", "agree", "you're right",
    ];
    const lower = viperResponse.toLowerCase();
    return signals.some((s) => lower.includes(s));
  }
}
